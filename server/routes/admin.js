import { Router } from 'express';
import { authRequired, adminOrModeratorRequired } from '../auth.js';
import db from '../db.js';

const router = Router();

// Проверка, что юзер именно АДМИН
function adminRequired(req, res, next) {
  try {
    const user = db.prepare('SELECT role, email FROM users WHERE id = ?').get(req.user.id);
    if (!user || (user.role !== 'admin' && user.email !== 'admin@games.shop')) {
      return res.status(403).json({ error: 'Доступ только для администратора' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Ошибка проверки прав' });
  }
}

// === 1. СТАТИСТИКА (Доступна Админу и Модератору) ===
router.get('/stats', authRequired, adminOrModeratorRequired, (req, res) => {
  try {
    const usersCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    const dealsCount = db.prepare("SELECT COUNT(*) AS c FROM deals").get().c;
    const commissionSum = db.prepare("SELECT SUM(commission) AS c FROM deals").get().c || 0;
    const activeProducts = db.prepare("SELECT COUNT(*) AS c FROM products WHERE status = 'active'").get().c;

    res.json({
      users: usersCount,
      deals: dealsCount,
      commission: commissionSum,
      activeProducts: activeProducts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === 2. СПИСОК ЮЗЕРОВ (ТОЛЬКО АДМИН) ===
router.get('/users', authRequired, adminRequired, (req, res) => {
  const q = (req.query.q || '').trim();
  const sort = req.query.sort || 'id';
  const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

  const allowedSort = ['id', 'balance', 'created_at', 'username'];
  const sortCol = allowedSort.includes(sort) ? sort : 'id';

  let sql = "SELECT id, username, email, balance, is_banned, role, created_at FROM users";
  let params = [];

  if (q) {
    sql += " WHERE email LIKE ? OR username LIKE ? OR id = ?";
    params.push(`%${q}%`, `%${q}%`, Number(q) || 0);
  }
  
  sql += ` ORDER BY ${sortCol} ${order} LIMIT 100`;
  const users = db.prepare(sql).all(...params);
  
  res.json({ users });
});

// === 3. БАН / РАЗБАН / РОЛИ (ТОЛЬКО АДМИН) ===
router.post('/users/:id/ban', authRequired, adminRequired, (req, res) => {
  const id = Number(req.params.id);
  const { reason } = req.body;
  const target = db.prepare("SELECT role FROM users WHERE id = ?").get(id);
  
  if (!target) return res.status(404).json({ error: 'Юзер не найден' });
  if (target.role === 'admin') return res.status(400).json({ error: 'Нельзя забанить админа' });
  if (id === req.user.id) return res.status(400).json({ error: 'Нельзя забанить себя' });

  db.prepare("UPDATE users SET is_banned=1, ban_reason=? WHERE id=?").run(reason || 'Нарушение правил', id);
  res.json({ ok: true });
});

router.post('/users/:id/unban', authRequired, adminRequired, (req, res) => {
  db.prepare("UPDATE users SET is_banned=0, ban_reason=NULL WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

router.post('/users/:id/role', authRequired, adminRequired, (req, res) => {
  const userId = Number(req.params.id);
  const { role } = req.body;

  if (!['user', 'moderator'].includes(role)) {
    return res.status(400).json({ error: 'Неверная роль' });
  }

  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.role === 'admin') return res.status(400).json({ error: 'Нельзя менять роль админа' });

  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  res.json({ ok: true, message: `Роль изменена на ${role}` });
});

// === 4. СПОРЫ (Доступны Админу и Модератору) ===
router.get('/disputes', authRequired, adminOrModeratorRequired, (req, res) => {
  const disputes = db.prepare(`
    SELECT d.*, 
           u1.username as buyer_name, u1.email as buyer_email,
           u2.username as seller_name, u2.email as seller_email
    FROM deals d
    JOIN users u1 ON u1.id = d.buyer_id
    JOIN users u2 ON u2.id = d.seller_id
    WHERE d.status = 'disputed'
    ORDER BY d.id DESC
  `).all();
  res.json({ disputes });
});

router.post('/disputes/:id/resolve', authRequired, adminOrModeratorRequired, (req, res) => {
  const dealId = Number(req.params.id);
  const { winner } = req.body;

  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(dealId);
  if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });
  if (deal.status !== 'disputed') return res.status(400).json({ error: 'Сделка не в статусе спора' });

  try {
    if (winner === 'buyer') {
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(deal.amount, deal.buyer_id);
      db.prepare("UPDATE deals SET status = 'cancelled' WHERE id = ?").run(dealId);
      db.prepare("UPDATE products SET status = 'active' WHERE id = ?").run(deal.product_id);
    } else if (winner === 'seller') {
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(deal.payout, deal.seller_id);
      db.prepare('UPDATE users SET balance = balance + ? WHERE email = ?').run(deal.commission, 'admin@games.shop');
      db.prepare("UPDATE deals SET status = 'completed' WHERE id = ?").run(dealId);
    } else {
      return res.status(400).json({ error: 'Неверный победитель' });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера при решении спора' });
  }
});

// === ТЕХПОДДЕРЖКА ДЛЯ АДМИНОВ ===

// 1. Список всех открытых чатов
router.get('/support', authRequired, adminOrModeratorRequired, (req, res) => {
  const chats = db.prepare(`
    SELECT c.*, u.username, u.avatar, 
           (SELECT text FROM support_messages WHERE chat_id = c.id ORDER BY id DESC LIMIT 1) as last_message,
           (SELECT created_at FROM support_messages WHERE chat_id = c.id ORDER BY id DESC LIMIT 1) as last_message_at
    FROM support_chats c
    JOIN users u ON u.id = c.user_id
    WHERE c.status = 'open'
    ORDER BY c.id DESC
  `).all();
  res.json({ chats });
});

// 2. Сообщения конкретного чата
router.get('/support/:chatId', authRequired, adminOrModeratorRequired, (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, u.username, u.role 
    FROM support_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.chat_id = ?
    ORDER BY m.id ASC
  `).all(req.params.chatId);
  res.json({ messages });
});

// 3. Ответ админа
router.post('/support/:chatId/reply', authRequired, adminOrModeratorRequired, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Пустое сообщение' });
  
  db.prepare("INSERT INTO support_messages (chat_id, sender_id, text) VALUES (?, ?, ?)")
    .run(req.params.chatId, req.user.id, text);
    
  res.json({ ok: true });
});


export default router;

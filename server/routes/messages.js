import { Router } from 'express';
import { authRequired } from '../auth.js';
import { dealsRepo } from '../db.js';
import db from '../db.js';

const router = Router();

function getMessages(dealId) {
  return db.prepare(`
    SELECT m.*, u.username AS sender_name, u.avatar AS sender_avatar
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.deal_id = ?
    ORDER BY m.created_at ASC
  `).all(dealId);
}


function checkAccess(deal, user) {
  if (!user) return false;
  const isStaff = user.role === 'admin' || user.role === 'moderator';
  return isStaff || deal.buyer_id === user.id || deal.seller_id === user.id;
}

router.get('/:dealId', authRequired, (req, res) => {
  const deal = dealsRepo.byId(Number(req.params.dealId));
if (!checkAccess(deal, req.user)) {
    return res.status(403).json({ error: 'Нет доступа к этой сделке' });
  }
// Помечаем сообщения собеседника как прочитанные
db.prepare("UPDATE messages SET is_read = 1 WHERE deal_id = ? AND sender_id != ?").run(deal.id, req.user.id);
  res.json(getMessages(deal.id));
});

router.post('/:dealId', authRequired, (req, res) => {
  const deal = dealsRepo.byId(Number(req.params.dealId));
if (!checkAccess(deal, req.user)) {
    return res.status(403).json({ error: 'Нет доступа к этой сделке' });
  }

  const text = String(req.body.text || '').trim().slice(0, 2000);
  if (!text) return res.status(400).json({ error: 'Пустое сообщение' });

  const result = db.prepare('INSERT INTO messages (deal_id, sender_id, text) VALUES (?, ?, ?)')
    .run(deal.id, req.user.id, text);

  const msg = db.prepare(`
    SELECT m.*, u.username AS sender_name, u.avatar AS sender_avatar
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(msg);
});

export { getMessages };

export default router;

import express from 'express';
import db from '../db.js';
import { authRequired } from '../auth.js';

const router = express.Router();

// === 1. СПИСОК ЧАТОВ ===
router.get('/', authRequired, (req, res) => {
  const userId = req.user.id;
  
  const chats = db.prepare(`
    SELECT d.*, 
           (SELECT text FROM messages WHERE deal_id = d.id ORDER BY id DESC LIMIT 1) as last_message,
           (SELECT created_at FROM messages WHERE deal_id = d.id ORDER BY id DESC LIMIT 1) as last_message_at,
           (SELECT COUNT(*) FROM messages WHERE deal_id = d.id AND sender_id != ? AND is_read = 0) as unread_count,
           u.username as partner_name, u.avatar as partner_avatar
    FROM deals d
    JOIN users u ON u.id = CASE WHEN d.buyer_id = ? THEN d.seller_id ELSE d.buyer_id END
    WHERE d.buyer_id = ? OR d.seller_id = ?
    ORDER BY d.id DESC
  `).all(userId, userId, userId, userId);

  chats.forEach(c => {
    if (!c.last_message) c.last_message = 'Начните диалог';
    if (!c.last_message_at) c.last_message_at = c.created_at;
  });

  res.json(chats);
});

// === 2. ИНФОРМАЦИЯ О ДИАЛОГЕ ===
router.get('/:dealId', authRequired, (req, res) => {
  const dealId = Number(req.params.dealId);
  
  const deal = db.prepare(`
    SELECT d.*, 
           b.username AS buyer_name, b.avatar AS buyer_avatar,
           s.username AS seller_name, s.avatar AS seller_avatar
    FROM deals d
    JOIN users b ON b.id = d.buyer_id
    JOIN users s ON s.id = d.seller_id
    WHERE d.id = ?
  `).get(dealId);

  if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });

  const isBuyer = deal.buyer_id === req.user.id;
  const isSeller = deal.seller_id === req.user.id;
  const isStaff = req.user.role === 'admin' || req.user.role === 'moderator';

  if (!isBuyer && !isSeller && !isStaff) {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  // Помечаем сообщения собеседника как прочитанные
  db.prepare("UPDATE messages SET is_read = 1 WHERE deal_id = ? AND sender_id != ?").run(deal.id, req.user.id);

  const partner = {
    id: isBuyer ? deal.seller_id : deal.buyer_id,
    username: isBuyer ? deal.seller_name : deal.buyer_name,
    avatar: isBuyer ? deal.seller_avatar : deal.buyer_avatar
  };

  res.json({
    deal: {
      id: deal.id,
      product_id: deal.product_id,
      product_title: deal.product_title,
      amount: deal.amount,
      status: deal.status,
      created_at: deal.created_at,
      is_buyer: isBuyer
    },
    partner
  });
});

export default router;

import { Router } from 'express';
import { authRequired } from '../auth.js';
import db from '../db.js';

const router = Router();

/* ==========================================================
   GET /api/chats — список чатов пользователя
   ========================================================== */

router.get('/', authRequired, (req, res) => {
  const userId = req.user.id;

  // Все сделки пользователя (как покупатель или продавец)
  const deals = db.prepare(`
    SELECT
      d.id, d.buyer_id, d.seller_id, d.product_id, d.product_title,
      d.amount, d.status, d.created_at,
      b.username AS buyer_name, b.avatar AS buyer_avatar,
      s.username AS seller_name, s.avatar AS seller_avatar,
      (SELECT url FROM product_images WHERE product_id = d.product_id ORDER BY id LIMIT 1) AS product_image
    FROM deals d
    JOIN users b ON b.id = d.buyer_id
    JOIN users s ON s.id = d.seller_id
    WHERE d.buyer_id = ? OR d.seller_id = ?
    ORDER BY d.created_at DESC
  `).all(userId, userId);

  // Для каждой сделки — последнее сообщение + непрочитанные
  const chats = deals.map(d => {
    const isBuyer = d.buyer_id === userId;
    const partnerName = isBuyer ? d.seller_name : d.buyer_name;
    const partnerAvatar = isBuyer ? d.seller_avatar : d.buyer_avatar;

    const lastMsg = db.prepare(`
      SELECT text, created_at, sender_id
      FROM messages
      WHERE deal_id = ?
      ORDER BY id DESC LIMIT 1
    `).get(d.id);

    // Считаем непрочитанные (все сообщения от собеседника, которые пришли позже последнего прочтения)
    // Упрощённо: все сообщения от собеседника за последние 24 часа без отметки "прочитано" — пока 0
    const unread = 0;

    return {
      deal_id: d.id,
      partner_name: partnerName,
      partner_avatar: partnerAvatar,
      product_title: d.product_title,
      product_image: d.product_image,
      deal_status: d.status,
      amount: d.amount,
      last_message: lastMsg ? lastMsg.text : '',
      last_message_at: lastMsg ? lastMsg.created_at : d.created_at,
      last_message_mine: lastMsg ? lastMsg.sender_id === userId : false,
      unread
    };
  });

  // Сортируем по времени последнего сообщения
  chats.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

  res.json(chats);
});

/* ==========================================================
   GET /api/chats/:dealId — информация о диалоге (собеседник)
   ========================================================== */

router.get('/:dealId', authRequired, (req, res) => {
  const deal = db.prepare(`
    SELECT d.*, b.username AS buyer_name, b.avatar AS buyer_avatar, b.id AS buyer_id,
           s.username AS seller_name, s.avatar AS seller_avatar, s.id AS seller_id
    FROM deals d
    JOIN users b ON b.id = d.buyer_id
    JOIN users s ON s.id = d.seller_id
    WHERE d.id = ?
  `).get(Number(req.params.dealId));

  if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });
  if (deal.buyer_id !== req.user.id && deal.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  const isBuyer = deal.buyer_id === req.user.id;
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

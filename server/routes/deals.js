import { Router } from 'express';
import { dealsRepo, productsRepo, usersRepo, txRepo } from '../db.js';
import db from '../db.js';
import { authRequired } from '../auth.js';
import { completeDeal, autoConfirmDate } from '../escrow.js';

const router = Router();
const COMMISSION_RATE = 0.15;

router.post('/', authRequired, (req, res) => {
  const { product_id } = req.body;
  const product = productsRepo.byId(product_id);

  if (!product || product.status !== 'active') return res.status(404).json({ error: 'Товар недоступен' });
  if (product.seller_id === req.user.id)       return res.status(400).json({ error: 'Нельзя купить свой товар' });

  const buyer = usersRepo.findById(req.user.id);
  if (buyer.balance < product.price) return res.status(400).json({ error: 'Недостаточно средств' });

  const commission = +(product.price * COMMISSION_RATE).toFixed(2);
  const payout     = +(product.price - commission).toFixed(2);

  usersRepo.freeze(buyer.id, product.price);

  const result = dealsRepo.create({
    buyer_id:      buyer.id,
    seller_id:     product.seller_id,
    product_id:    product.id,
    product_title: product.title,
    amount:        product.price,
    commission,
    payout,
    auto_confirm:  autoConfirmDate()
  });

  productsRepo.remove(product.id, product.seller_id);

  txRepo.create({
    user_id: buyer.id,
    type: 'purchase_hold',
    amount: -product.price,
    status: 'pending',
    description: `Покупка "${product.title}" — в блокировке до подтверждения (7 дней)`
  });

  res.status(201).json(dealsRepo.byId(result.lastInsertRowid));
});

router.get('/', authRequired, (req, res) => {
  res.json(dealsRepo.byUser(req.user.id));
});


/* GET /api/deals/:id — детали сделки */
router.get('/:id', authRequired, (req, res) => {
  const deal = dealsRepo.byId(Number(req.params.id));
  if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });

const isBuyer = deal.buyer_id === req.user.id;
const isSeller = deal.seller_id === req.user.id;
const isStaff = req.user.role === 'admin' || req.user.role === 'moderator';

if (!isBuyer && !isSeller && !isStaff) {
  return res.status(403).json({ error: 'Нет доступа' });
}

// Если зашел админ или модератор, отправляем системное сообщение (один раз)
if (isStaff && deal.status === 'disputed') {
    const sysMsg = db.prepare("SELECT * FROM messages WHERE deal_id = ? AND text = 'Администратор присоединился к чату'").get(deal.id);
    if (!sysMsg) {
        db.prepare("INSERT INTO messages (deal_id, sender_id, text) VALUES (?, ?, ?)").run(deal.id, req.user.id, 'Администратор присоединился к чату');
    }
}

  // Товар
  const product = productsRepo.byId(deal.product_id);
  const productData = product ? {
    id: product.id,
    title: product.title,
    game: product.game,
    category: product.category,
    description: product.description,
    icon: product.icon,
    transfer_type: product.transfer_type,
    images: db.prepare('SELECT url FROM product_images WHERE product_id = ? ORDER BY id').all(product.id),
    // Приватные данные — только покупателю после покупки
    login:      (isBuyer && deal.status !== 'cancelled') ? product.login : null,
    password:   (isBuyer && deal.status !== 'cancelled') ? product.password : null,
    account_id: (isBuyer && deal.status !== 'cancelled') ? product.account_id : null,
    comment:    (isBuyer && deal.status !== 'cancelled') ? product.comment : null
  } : null;

  // Партнёр
  const partner = isBuyer
    ? db.prepare('SELECT id, username, avatar, rating, reviews_count FROM users WHERE id = ?').get(deal.seller_id)
    : db.prepare('SELECT id, username, avatar, rating, reviews_count FROM users WHERE id = ?').get(deal.buyer_id);

  // Отзыв (если уже оставлен)
  const review = db.prepare('SELECT id, rating, text FROM reviews WHERE deal_id = ?').get(deal.id);

  res.json({
    deal: {
      id: deal.id,
      amount: deal.amount,
      commission: deal.commission,
      payout: deal.payout,
      status: deal.status,
      created_at: deal.created_at,
      confirmed_at: deal.confirmed_at,
      is_buyer: isBuyer,
      is_seller: isSeller
    },
    product: productData,
    partner,
    review: review || null
  });
});

router.post('/:id/confirm', authRequired, (req, res) => {
  const deal = dealsRepo.byId(Number(req.params.id));
  if (!deal) return res.status(404).json({ error: 'Не найдена' });
  if (deal.buyer_id !== req.user.id) return res.status(403).json({ error: 'Нет доступа' });
  if (deal.status !== 'pending')     return res.status(400).json({ error: 'Сделка уже завершена' });

  completeDeal(deal);
  txRepo.create({
    user_id: deal.buyer_id,
    type: 'purchase_confirmed',
    amount: 0,
    status: 'completed',
    description: `Сделка #${deal.id} подтверждена`
  });

  res.json({ ok: true, payout: deal.payout });
});

router.post('/:id/cancel', authRequired, (req, res) => {
  const deal = dealsRepo.byId(Number(req.params.id));
  if (!deal) return res.status(404).json({ error: 'Не найдена' });
  if (deal.buyer_id !== req.user.id && deal.seller_id !== req.user.id)
    return res.status(403).json({ error: 'Нет доступа' });
  if (deal.status !== 'pending') return res.status(400).json({ error: 'Уже завершена' });

  usersRepo.unfreeze(deal.buyer_id, deal.amount);
  usersRepo.updateBalance(deal.buyer_id, deal.amount);
  dealsRepo.updateStatus(deal.id, 'cancelled');

  txRepo.create({
    user_id: deal.buyer_id,
    type: 'refund',
    amount: deal.amount,
    status: 'completed',
    description: `Возврат по сделке #${deal.id}`
  });

  res.json({ ok: true });
});

// --- ОТКРЫТИЕ СПОРА ---
router.post('/:id/dispute', authRequired, (req, res) => {
  const dealId = Number(req.params.id);
  const deal = dealsRepo.byId(dealId);

  if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });
  if (deal.buyer_id !== req.user.id) return res.status(403).json({ error: 'Только покупатель может открыть спор' });
  if (deal.status !== 'pending') return res.status(400).json({ error: 'Спор можно открыть только по активной сделке' });

  // Меняем статус на disputed
  db.prepare("UPDATE deals SET status = 'disputed' WHERE id = ?").run(dealId);

  res.json({ ok: true, message: 'Спор открыт. Ожидайте решения администратора.' });
});

export default router;

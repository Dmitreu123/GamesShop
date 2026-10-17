import { Router } from 'express';
import { usersRepo, txRepo } from '../db.js';
import db from '../db.js';
import { authRequired } from '../auth.js';

const router = Router();

/* ---------- Баланс ---------- */

router.get('/balance', authRequired, (req, res) => {
  const user = usersRepo.findById(req.user.id);
  if (!user) return res.status(401).json({ error: 'Сессия устарела' });
  res.json({
    balance: user.balance,
    frozen: user.frozen,
    available: user.balance // пока нет удержания
  });
});

/* ---------- История с фильтрами ---------- */

router.get('/transactions', authRequired, (req, res) => {
  const { type, method, status, min, max, sort } = req.query;

  let rows = db.prepare(`
    SELECT * FROM transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 200
  `).all(req.user.id);

  // Фильтры
  if (type && type !== 'all')     rows = rows.filter(t => t.type === type);
  if (method && method !== 'all') rows = rows.filter(t => t.method === method);
  if (status && status !== 'all') rows = rows.filter(t => t.status === status);
  if (min) rows = rows.filter(t => Math.abs(t.amount) >= Number(min));
  if (max) rows = rows.filter(t => Math.abs(t.amount) <= Number(max));

  // Сортировка
  if (sort === 'old') rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  else rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(rows);
});

/* ---------- Пополнение ---------- */

router.post('/deposit', authRequired, (req, res) => {
  const amount = Number(req.body.amount);
  const method = String(req.body.method || 'card');

  if (!amount || amount <= 0) return res.status(400).json({ error: 'Неверная сумма' });
  if (amount > 100000)        return res.status(400).json({ error: 'Максимум 100 000 ₽ за раз' });

  usersRepo.updateBalance(req.user.id, amount);
  txRepo.create({
    user_id: req.user.id,
    type: 'deposit',
    amount,
    status: 'success',
    method,
    description: `Пополнение на ${amount} ₽`
  });

  res.json({ balance: usersRepo.findById(req.user.id).balance });
});

/* ---------- Вывод ---------- */

router.post('/withdraw', authRequired, (req, res) => {
  const amount = Number(req.body.amount);
  const method = String(req.body.method || 'sbp');

  if (!amount || amount <= 0) return res.status(400).json({ error: 'Неверная сумма' });
  if (amount < 100)           return res.status(400).json({ error: 'Минимум 100 ₽' });

  const user = usersRepo.findById(req.user.id);
  if (user.balance < amount) return res.status(400).json({ error: 'Недостаточно средств' });

  usersRepo.updateBalance(req.user.id, -amount);
  txRepo.create({
    user_id: req.user.id,
    type: 'withdraw',
    amount: -amount,
    status: 'processing',
    method,
    description: `Вывод ${amount} ₽`
  });

  res.json({ balance: usersRepo.findById(req.user.id).balance });
});

export default router;

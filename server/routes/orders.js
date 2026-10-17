import { Router } from 'express';

const router = Router();
const orders = [];

router.post('/', (req, res) => {
  const { items, total } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Корзина пуста' });
  }
  const order = {
    id: orders.length + 1000,
    items, total,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  orders.push(order);
  res.status(201).json(order);
});

router.get('/', (req, res) => res.json(orders));

export default router;
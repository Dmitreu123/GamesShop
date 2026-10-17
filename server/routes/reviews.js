import { Router } from 'express';
import { reviewsRepo, dealsRepo, usersRepo } from '../db.js';
import { authRequired } from '../auth.js';

const router = Router();

router.post('/', authRequired, (req, res) => {
  const { deal_id, rating, text } = req.body;
  const deal = dealsRepo.byId(Number(deal_id));

  if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });
  if (deal.buyer_id !== req.user.id) return res.status(403).json({ error: 'Только покупатель' });
  if (deal.status !== 'completed')   return res.status(400).json({ error: 'Сделка не завершена' });
  if (reviewsRepo.forDeal(deal.id))  return res.status(409).json({ error: 'Отзыв уже оставлен' });

  const r = Math.max(1, Math.min(5, Number(rating) || 5));

  reviewsRepo.create({
    deal_id:   deal.id,
    author_id: deal.buyer_id,
    target_id: deal.seller_id,
    rating:    r,
    text:      String(text || '').slice(0, 500)
  });

  usersRepo.refreshRating(deal.seller_id);
  res.status(201).json({ ok: true });
});

router.get('/user/:username', (req, res) => {
  const u = usersRepo.findByUsername(req.params.username);
  if (!u) return res.status(404).json({ error: 'Не найден' });
  res.json(reviewsRepo.byTarget(u.id));
});

export default router;
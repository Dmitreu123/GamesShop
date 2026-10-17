import { dealsRepo, usersRepo, txRepo } from './db.js';
import db from './db.js';

const AUTO_CONFIRM_DAYS = 7;

export function autoConfirmDate() {
  const d = new Date();
  d.setDate(d.getDate() + AUTO_CONFIRM_DAYS);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function completeDeal(deal) {
  usersRepo.unfreeze(deal.buyer_id, deal.amount);
  usersRepo.payout(deal.seller_id, deal.payout);
  usersRepo.incrementDeals(deal.buyer_id);
  usersRepo.incrementDeals(deal.seller_id);
  dealsRepo.updateStatus(deal.id, 'completed');

  txRepo.create({
    user_id: deal.seller_id,
    type: 'payout',
    amount: deal.payout,
    status: 'completed',
    description: `Выплата по сделке #${deal.id} (комиссия ${deal.commission} ₽)`
  });

  // 💰 Комиссия админу площадки
  const admin = usersRepo.findAdmin();
  if (admin && deal.commission > 0) {
    usersRepo.updateBalance(admin.id, deal.commission);
    txRepo.create({
      user_id: admin.id,
      type: 'commission',
      amount: deal.commission,
      status: 'success',
      method: 'balance',
      description: `Комиссия 15% по сделке #${deal.id}`
    });
  }
}

export function startEscrowWorker() {
  setInterval(() => {
    try {
      const expired = dealsRepo.pendingWithExpired();
      for (const deal of expired) {
        console.log(`⏰ Автоподтверждение сделки #${deal.id}`);
        completeDeal(deal);
        txRepo.create({
          user_id: deal.buyer_id,
          type: 'auto_confirm',
          amount: 0,
          status: 'completed',
          description: `Сделка #${deal.id} автоматически подтверждена (истёк 7-дневный срок)`
        });
      }
    } catch (e) { console.error('escrow worker error:', e); }
  }, 60 * 60 * 1000);

  console.log('⏱️  Escrow-воркер запущен (проверка каждый час)');
}


/* ==========================================================
   Авто-поднятие премиум-товаров (раз в час)
   ========================================================== */

const AUTO_BOOST_HOURS = 24;

export function startAutoBoostWorker() {
  setInterval(() => {
    try {
      const products = db.prepare(`
        SELECT id, seller_id FROM products
        WHERE status = 'active'
          AND auto_boost = 1
          AND (last_boosted_at IS NULL OR datetime(last_boosted_at, '+${AUTO_BOOST_HOURS} hours') <= datetime('now'))
      `).all();

      if (products.length === 0) return;

      const update = db.prepare('UPDATE products SET last_boosted_at = CURRENT_TIMESTAMP, is_premium = 1 WHERE id = ?');
      for (const p of products) {
        update.run(p.id);
      }

      console.log(`🚀 Авто-поднятие: ${products.length} товаров`);
    } catch (e) {
      console.error('auto-boost worker error:', e.message);
    }
  }, 60 * 60 * 1000);

  console.log('🚀 Авто-поднятие премиум-товаров запущено');
}

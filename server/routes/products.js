import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { productsRepo, usersRepo, txRepo } from '../db.js';
import db from '../db.js';
import { authRequired, authOptional } from '../auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `product_${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(png|jpe?g|gif|webp)/.test(file.mimetype);
    cb(ok ? null : new Error('Только изображения'), ok);
  }
});

const router = Router();

/* ---------- Константы премиума ---------- */
const PREMIUM_FREE  = true;   // ← когда сайт запустится — поставь false
const PREMIUM_PRICE = 19;     // разово
const BOOST_PRICE   = 9;      // за 24 часа авто-поднятия

/* ---------- Вспомогательные ---------- */

function getImages(productId) {
  return db.prepare('SELECT id, url FROM product_images WHERE product_id = ? ORDER BY id ASC').all(productId);
}

/* Сортировка: премиум → по last_boosted_at, потом обычные → по created_at */
function sortCatalog(list) {
  return list.sort((a, b) => {
    if (a.is_premium && !b.is_premium) return -1;
    if (!a.is_premium && b.is_premium) return 1;
    if (a.is_premium && b.is_premium) {
      return new Date(b.last_boosted_at || b.created_at) - new Date(a.last_boosted_at || a.created_at);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

/* ---------- GET /api/products ---------- */

router.get('/', authOptional, (req, res) => {
  let result = productsRepo.all();

  const { game, category, q } = req.query;
  if (game)     result = result.filter(p => p.game === game);
  if (category && category !== 'all') result = result.filter(p => p.category === category);
  if (q) {
    const query = q.toLowerCase();
    result = result.filter(p =>
      p.title.toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query)
    );
  }

  result = sortCatalog(result);
  result = result.map(p => ({ ...p, images: getImages(p.id) }));

  res.json(result);
});

/* ---------- GET /api/products/:id ---------- */

/* GET /api/products/:id — полные данные для страницы товара */
router.get('/:id', (req, res) => {
  const product = productsRepo.byId(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Товар не найден' });

  // Данные о продавце
  const seller = db.prepare(`
    SELECT id, username, avatar, rating, reviews_count, deals_count, is_verified, created_at
    FROM users WHERE id = ?
  `).get(product.seller_id);

  // Отзывы о продавце (первые 3)
  const reviews = db.prepare(`
    SELECT r.id, r.rating, r.text, r.created_at,
           u.username AS author_name, u.avatar AS author_avatar
    FROM reviews r
    JOIN users u ON u.id = r.author_id
    WHERE r.target_id = ?
    ORDER BY r.created_at DESC
    LIMIT 3
  `).all(product.seller_id);

  // Похожие товары (та же игра/категория, кроме этого)
  const similar = db.prepare(`
    SELECT p.id, p.title, p.price, p.old_price, p.icon, p.is_premium,
           (SELECT url FROM product_images WHERE product_id = p.id ORDER BY id LIMIT 1) AS image
    FROM products p
    WHERE p.status = 'active'
      AND p.id != ?
      AND (p.game = ? OR p.category = ?)
    ORDER BY RANDOM()
    LIMIT 6
  `).all(product.id, product.game, product.category);

  // Публичные данные (без приватных полей)
  const safe = { ...product };
  delete safe.login;
  delete safe.password;
  delete safe.account_id;
  delete safe.comment;

  safe.images = getImages(product.id);
  safe.seller = seller;
  safe.reviews = reviews;
  safe.similar = similar;

  res.json(safe);
});

/* ---------- GET /api/products/:id/private ---------- */

router.get('/:id/private', authRequired, (req, res) => {
  const product = productsRepo.byId(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Товар не найден' });

  const deal = db.prepare(`
    SELECT id, status FROM deals
    WHERE product_id = ? AND buyer_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(product.id, req.user.id);

  if (!deal) return res.status(403).json({ error: 'Нет доступа к данным товара' });
  if (deal.status === 'cancelled') return res.status(403).json({ error: 'Сделка отменена' });

  res.json({
    login:         product.login,
    password:      product.password,
    account_id:    product.account_id,
    comment:       product.comment,
    transfer_type: product.transfer_type
  });
});

/* ---------- POST /api/products — создать товар ---------- */

router.post('/', authRequired, upload.array('images', 10), (req, res) => {
const {
  title, description, price, game, category, subcategory, icon,
  transfer_type, login, password, account_id, comment,
  is_premium, auto_boost
} = req.body;

  if (!title || !price || !game || !category) {
    return res.status(400).json({ error: 'Заполните обязательные поля' });
  }
  if (Number(price) < 50) {
    return res.status(400).json({ error: 'Минимальная цена — 50 ₽' });
  }

  const wantPremium = is_premium === 'true' || is_premium === '1';
  const wantAuto    = auto_boost === 'true' || auto_boost === '1';

  // Проверка баланса (если премиум платный)
  if (!PREMIUM_FREE && (wantPremium || wantAuto)) {
    const user = usersRepo.findById(req.user.id);
    let totalCost = 0;
    if (wantPremium) totalCost += PREMIUM_PRICE;
    if (wantAuto)    totalCost += BOOST_PRICE;

    if (user.balance < totalCost) {
      return res.status(400).json({ error: `Недостаточно средств (нужно ${totalCost} ₽)` });
    }

usersRepo.updateBalance(req.user.id, -totalCost);
txRepo.create({
  user_id: req.user.id,
  type: 'premium_purchase',
  amount: -totalCost,
  status: 'success',
  method: 'balance',
  description: `Премиум${wantAuto ? ' + Авто-поднятие' : ''}`
});

const admin = usersRepo.findAdmin();
if (admin) {
  usersRepo.updateBalance(admin.id, totalCost);
  txRepo.create({
    user_id: admin.id,
    type: 'premium_income',
    amount: totalCost,
    status: 'success',
    method: 'balance',
    description: `Премиум от @${req.user.username || 'user'}`
  });
}
}

  const result = db.prepare(`
INSERT INTO products
  (seller_id, title, description, price, game, category, subcategory, icon,
   transfer_type, login, password, account_id, comment,
   is_premium, auto_boost, last_boosted_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    req.user.id,
    title,
    description || '',
    Number(price),
    game,
    category,
    subcategory || '',
    icon || 'fas fa-box',
    transfer_type || 'full',
    login || '',
    password || '',
    account_id || '',
    comment || '',
    wantPremium ? 1 : 0,
    wantAuto ? 1 : 0
  );

  const productId = result.lastInsertRowid;

  if (req.files && req.files.length > 0) {
    const insertImg = db.prepare('INSERT INTO product_images (product_id, url) VALUES (?, ?)');
    for (const file of req.files) {
      insertImg.run(productId, `/uploads/${file.filename}`);
    }
  }

  const product = productsRepo.byId(productId);
  product.images = getImages(productId);
  res.status(201).json(product);
});

/* ---------- POST /api/products/:id/boost — ручное поднятие ---------- */

router.post('/:id/boost', authRequired, (req, res) => {
  const product = productsRepo.byId(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'Нет доступа' });

  if (!PREMIUM_FREE) {
    const user = usersRepo.findById(req.user.id);
    if (user.balance < PREMIUM_PRICE) {
      return res.status(400).json({ error: `Недостаточно средств (нужно ${PREMIUM_PRICE} ₽)` });
    }

usersRepo.updateBalance(req.user.id, -PREMIUM_PRICE);
txRepo.create({
  user_id: req.user.id,
  type: 'premium_boost',
  amount: -PREMIUM_PRICE,
  status: 'success',
  method: 'balance',
  description: `Поднятие товара #${product.id} в топ`
});

const admin1 = usersRepo.findAdmin();
if (admin1) {
  usersRepo.updateBalance(admin1.id, PREMIUM_PRICE);
  txRepo.create({
    user_id: admin1.id,
    type: 'premium_income',
    amount: PREMIUM_PRICE,
    status: 'success',
    method: 'balance',
    description: `Поднятие товара #${product.id}`
  });
}
}
  db.prepare('UPDATE products SET is_premium = 1, last_boosted_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(product.id);

  res.json({ ok: true });
});

/* ---------- POST /api/products/:id/auto-boost — переключить авто ---------- */

router.post('/:id/auto-boost', authRequired, (req, res) => {
  const product = productsRepo.byId(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'Нет доступа' });

  const enable = !product.auto_boost;

  if (enable && !PREMIUM_FREE) {
    const user = usersRepo.findById(req.user.id);
    if (user.balance < BOOST_PRICE) {
      return res.status(400).json({ error: `Недостаточно средств (нужно ${BOOST_PRICE} ₽)` });
    }
usersRepo.updateBalance(req.user.id, -BOOST_PRICE);
txRepo.create({
  user_id: req.user.id,
  type: 'auto_boost_on',
  amount: -BOOST_PRICE,
  status: 'success',
  method: 'balance',
  description: `Авто-поднятие для товара #${product.id}`
});

const admin2 = usersRepo.findAdmin();
if (admin2) {
  usersRepo.updateBalance(admin2.id, BOOST_PRICE);
  txRepo.create({
    user_id: admin2.id,
    type: 'premium_income',
    amount: BOOST_PRICE,
    status: 'success',
    method: 'balance',
    description: `Авто-поднятие #${product.id}`
  });
}
}
  db.prepare('UPDATE products SET auto_boost = ? WHERE id = ?')
    .run(enable ? 1 : 0, product.id);

  res.json({ ok: true, auto_boost: enable });
});

/* ---------- DELETE /api/products/:id ---------- */

/* ---------- POST /:id/view — счётчик просмотров ---------- */

router.post('/:id/view', (req, res) => {
  const product = productsRepo.byId(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Товар не найден' });

  db.prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(product.id);
  res.json({ ok: true, views: (product.views || 0) + 1 });
});

/* ---------- POST /:id/remove — снять с продажи ---------- */

router.post('/:id/remove', authRequired, (req, res) => {
  const product = productsRepo.byId(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'Нет доступа' });

  db.prepare("UPDATE products SET status = 'removed' WHERE id = ?").run(product.id);
  res.json({ ok: true });
});

/* ---------- PUT /:id — редактировать товар ---------- */

router.put('/:id', authRequired, (req, res) => {
  const product = productsRepo.byId(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'Нет доступа' });

  const { title, description, price, subcategory, transfer_type, login, password, account_id, comment } = req.body;

  if (!title || !price) return res.status(400).json({ error: 'Заполните обязательные поля' });
  if (Number(price) < 50) return res.status(400).json({ error: 'Минимальная цена — 50 ₽' });

  db.prepare(`
    UPDATE products
    SET title = ?, description = ?, price = ?, subcategory = ?,
        transfer_type = ?, login = ?, password = ?, account_id = ?, comment = ?
    WHERE id = ?
  `).run(
    title,
    description || '',
    Number(price),
    subcategory || '',
    transfer_type || product.transfer_type,
    login || '',
    password || '',
    account_id || '',
    comment || '',
    product.id
  );

  res.json(productsRepo.byId(product.id));
});


router.delete('/:id', authRequired, (req, res) => {
  const product = productsRepo.byId(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'Нет доступа' });

  productsRepo.remove(product.id, req.user.id);
  res.json({ ok: true });
});

export default router;

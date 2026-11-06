import { sendVerificationCode } from '../mailer.js';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { usersRepo, reviewsRepo } from '../db.js';
import db from '../db.js';
import { signToken, authRequired, authOptional } from '../auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(png|jpe?g|gif|webp)/.test(file.mimetype);
    cb(ok ? null : new Error('Только изображения'), ok);
  }
});

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log('🔥 ПОПЫТКА РЕГИСТРАЦИИ:', { username, email });

    // 1. Проверяем email
    const existingEmail = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    // Если почта есть и ОНА УЖЕ ПОДТВЕРЖДЕНА — блокируем
    if (existingEmail && existingEmail.is_verified_email === 1) {
      return res.status(400).json({ error: 'Этот Email уже зарегистрирован и подтвержден' });
    }

    // 2. Проверяем ник (если он занят кем-то ДРУГИМ)
    const existingUsername = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (existingUsername && (!existingEmail || existingUsername.id !== existingEmail.id)) {
      return res.status(400).json({ error: 'Этот Ник уже занят' });
    }

    // 3. Хэшируем пароль
    const hashedPassword = bcrypt.hashSync(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    if (existingEmail && existingEmail.is_verified_email === 0) {
        // Если почта есть, но не подтверждена — просто ОБНОВЛЯЕМ данные и код
        db.prepare("UPDATE users SET username = ?, password_hash = ?, verify_code = ? WHERE id = ?")
          .run(username, hashedPassword, code, existingEmail.id);
    } else {
        // Если почты нет — создаем нового
        db.prepare(`
          INSERT INTO users (username, email, password_hash, verify_code, is_verified_email)
          VALUES (?, ?, ?, ?, 0)
        `).run(username, email, hashedPassword, code);
    }

    // 4. Отправляем код
    try {
        const sent = await sendVerificationCode(email, code);
        if (!sent) throw new Error('Gmail отклонил отправку');
    } catch (mailError) {
        console.error('ОШИБКА ПОЧТЫ:', mailError);
        return res.status(500).json({ error: 'Ошибка отправки письма: ' + mailError.message });
    }

    res.json({ message: 'Код отправлен на почту', email });
  } catch (err) {
    console.error('❌ ОШИБКА РЕГИСТРАЦИИ:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-email', (req, res) => {
  const { email, code } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.verify_code !== code) return res.status(400).json({ error: 'Неверный код' });

  db.prepare("UPDATE users SET is_verified_email = 1, verify_code = NULL WHERE id = ?").run(user.id);

  res.json({ message: 'Почта подтверждена!' });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const row = usersRepo.findByEmail(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  const user = usersRepo.findById(row.id);
  res.json({ token: signToken(user), user });
});

router.get('/me', authRequired, (req, res) => {
  const user = usersRepo.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Не найден' });
  res.json(user);
});

router.get('/:username', (req, res) => {
  const user = usersRepo.findByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const reviews = reviewsRepo.byTarget(user.id);
  res.json({ user, reviews });
});

router.patch('/me/bio', authRequired, (req, res) => {
  usersRepo.updateBio(req.user.id, String(req.body.bio || '').slice(0, 300));
  res.json({ ok: true });
});

/* ---------- GET /api/users/:username/profile — счётчики профиля ---------- */

router.get('/:username/profile', authOptional, (req, res) => {
  const user = usersRepo.findByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  // Баланс виден только самому владельцу профиля
  if (req.user && req.user.id === user.id) {
    const me = usersRepo.findById(user.id);
    user.balance = me.balance;
    user.frozen = me.frozen;
  }

  const counts = {
    products_active: db.prepare("SELECT COUNT(*) AS c FROM products WHERE seller_id = ? AND status = 'active'").get(user.id).c,
    products_sold:   db.prepare("SELECT COUNT(*) AS c FROM deals WHERE seller_id = ? AND status = 'completed'").get(user.id).c,
    purchases_active: db.prepare("SELECT COUNT(*) AS c FROM deals WHERE buyer_id = ? AND status = 'pending'").get(user.id).c,
    purchases_done:   db.prepare("SELECT COUNT(*) AS c FROM deals WHERE buyer_id = ? AND status = 'completed'").get(user.id).c,
    sales_active:     db.prepare("SELECT COUNT(*) AS c FROM deals WHERE seller_id = ? AND status = 'pending'").get(user.id).c,
    sales_done:       db.prepare("SELECT COUNT(*) AS c FROM deals WHERE seller_id = ? AND status = 'completed'").get(user.id).c
  };

  res.json({ user, counts });
});

/* ---------- GET /api/users/:username/products?status=active|sold ---------- */

router.get('/:username/products', (req, res) => {
  const user = usersRepo.findByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'Не найден' });

  const status = req.query.status || 'active';

  let rows;
if (status === 'active') {
    rows = db.prepare(`
        SELECT p.*, 
               (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1) AS image 
        FROM products p 
        WHERE p.seller_id = ? AND p.status = 'active' 
        ORDER BY p.created_at DESC
    `).all(user.id);
}
  } else {
    rows = db.prepare(`
      SELECT d.id AS deal_id, d.amount, d.status AS deal_status, d.created_at,
             p.title, p.game, p.category, p.id AS product_id,
             (SELECT url FROM product_images WHERE product_id = p.id ORDER BY id LIMIT 1) AS image
      FROM deals d
      JOIN products p ON p.id = d.product_id
      WHERE d.seller_id = ? AND d.status = 'completed'
      ORDER BY d.created_at DESC
    `).all(user.id);
  }

  res.json(rows);
});

/* ---------- GET /api/users/:username/purchases?status=active|done ---------- */

router.get('/:username/purchases', (req, res) => {
  const user = usersRepo.findByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'Не найден' });

  const status = req.query.status || 'active';
  const dealStatus = status === 'done' ? 'completed' : 'pending';

  const rows = db.prepare(`
    SELECT d.id AS deal_id, d.amount, d.status AS deal_status, d.created_at,
           p.title, p.game, p.category, p.id AS product_id,
           s.username AS seller_name,
           (SELECT url FROM product_images WHERE product_id = p.id ORDER BY id LIMIT 1) AS image
    FROM deals d
    JOIN products p ON p.id = d.product_id
    JOIN users s ON s.id = d.seller_id
    WHERE d.buyer_id = ? AND d.status = ?
    ORDER BY d.created_at DESC
  `).all(user.id, dealStatus);

  res.json(rows);
});

/* ---------- GET /api/users/:username/sales?status=active|done ---------- */

router.get('/:username/sales', (req, res) => {
  const user = usersRepo.findByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'Не найден' });

  const status = req.query.status || 'active';
  const dealStatus = status === 'done' ? 'completed' : 'pending';

  const rows = db.prepare(`
    SELECT d.id AS deal_id, d.amount, d.status AS deal_status, d.created_at,
           p.title, p.game, p.category, p.id AS product_id,
           b.username AS buyer_name,
           (SELECT url FROM product_images WHERE product_id = p.id ORDER BY id LIMIT 1) AS image
    FROM deals d
    JOIN products p ON p.id = d.product_id
    JOIN users b ON b.id = d.buyer_id
    WHERE d.seller_id = ? AND d.status = ?
    ORDER BY d.created_at DESC
  `).all(user.id, dealStatus);

  res.json(rows);
});

router.post('/me/avatar', authRequired, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
  const url = `/uploads/${req.file.filename}`;
  usersRepo.updateAvatar(req.user.id, url);
  res.json({ avatar: url });
});

// === ПОЛУЧЕНИЕ ВСЕХ ОТЗЫВОВ ПОЛЬЗОВАТЕЛЯ ===
router.get('/:username/reviews', (req, res) => {
  const user = usersRepo.findByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const reviews = db.prepare(`
    SELECT r.*, 
           u.username as author_name, u.avatar as author_avatar,
           p.title as product_title, p.price as product_price, p.id as product_id, p.icon as product_icon,
           (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1) as product_image
    FROM reviews r
    JOIN users u ON u.id = r.author_id
    JOIN deals d ON d.id = r.deal_id
    JOIN products p ON p.id = d.product_id
    WHERE r.target_id = ?
    ORDER BY r.id DESC
  `).all(user.id);

  res.json({ reviews });
});

export default router;

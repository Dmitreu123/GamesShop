/* ==========================================================
   SQLite база данных — полная версия с is_admin и DB_PATH
   ========================================================== */

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Путь к БД (на Railway берется из переменной DB_PATH)
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'games-shop.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ---------- Схема ---------- */

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar        TEXT,
    bio           TEXT DEFAULT '',
    balance       REAL DEFAULT 0,
    frozen        REAL DEFAULT 0,
    rating        REAL DEFAULT 5.0,
    reviews_count INTEGER DEFAULT 0,
    deals_count   INTEGER DEFAULT 0,
    is_verified   INTEGER DEFAULT 0,
    is_admin      INTEGER DEFAULT 0,
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id      INTEGER NOT NULL,
    title          TEXT NOT NULL,
    description    TEXT,
    price          REAL NOT NULL,
    old_price      REAL DEFAULT NULL,
    game           TEXT NOT NULL,
    category       TEXT NOT NULL,
    subcategory    TEXT DEFAULT '',
    icon           TEXT DEFAULT 'fas fa-box',
    transfer_type  TEXT DEFAULT 'full',
    login          TEXT DEFAULT '',
    password       TEXT DEFAULT '',
    account_id     TEXT DEFAULT '',
    comment        TEXT DEFAULT '',
    is_premium     INTEGER DEFAULT 0,
    premium_until  TEXT,
    auto_boost     INTEGER DEFAULT 0,
    last_boosted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    views          INTEGER DEFAULT 0,
    status         TEXT DEFAULT 'active',
    created_at     TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL,
    url         TEXT NOT NULL,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS deals (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id      INTEGER NOT NULL,
    seller_id     INTEGER NOT NULL,
    product_id    INTEGER NOT NULL,
    product_title TEXT NOT NULL,
    amount        REAL NOT NULL,
    commission    REAL NOT NULL,
    payout        REAL NOT NULL,
    status        TEXT DEFAULT 'pending',
    auto_confirm  TEXT,
    confirmed_at  TEXT,
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id)   REFERENCES users(id),
    FOREIGN KEY (seller_id)  REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id     INTEGER UNIQUE NOT NULL,
    author_id   INTEGER NOT NULL,
    target_id   INTEGER NOT NULL,
    rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    text        TEXT DEFAULT '',
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id)   REFERENCES deals(id),
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (target_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id     INTEGER NOT NULL,
    sender_id   INTEGER NOT NULL,
    text        TEXT NOT NULL,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id)   REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    type        TEXT NOT NULL,
    amount      REAL NOT NULL,
    status      TEXT DEFAULT 'success',
    method      TEXT DEFAULT '',
    description TEXT,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
  CREATE INDEX IF NOT EXISTS idx_deals_buyer     ON deals(buyer_id);
  CREATE INDEX IF NOT EXISTS idx_deals_seller    ON deals(seller_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_target  ON reviews(target_id);
  CREATE INDEX IF NOT EXISTS idx_messages_deal   ON messages(deal_id);
`);

/* ---------- Сид (Демо и Админ) ---------- */

const seed = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@games.shop');
if (!seed) {
  const hash = bcrypt.hashSync('demo123', 10);
  db.prepare('INSERT INTO users (username, email, password_hash, balance) VALUES (?,?,?,?)')
    .run('demo', 'demo@games.shop', hash, 5000);
  console.log('👤 demo@games.shop / demo123 (баланс 5000 ₽)');
}

const adminSeed = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@games.shop');
if (!adminSeed) {
  const adminHash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, email, password_hash, balance, is_admin) VALUES (?,?,?,?,1)')
    .run('admin', 'admin@games.shop', adminHash, 0);
  console.log('👑 admin@games.shop / admin123 (админ площадки)');
}

/* ---------- Репозитории ---------- */

export const usersRepo = {
  create: (username, email, hash) =>
    db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?,?,?)')
      .run(username, email, hash),

  findByEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email),

  findById: (id) =>
    db.prepare(`SELECT id, username, email, avatar, bio, balance, frozen,
                rating, reviews_count, deals_count, is_verified, is_admin, created_at
                FROM users WHERE id = ?`).get(id),

findByUsername: (username) =>
  db.prepare(`
    SELECT id, username, email, avatar, bio, balance, frozen, rating, reviews_count, deals_count, is_verified, created_at, role
    FROM users WHERE username = ?
  `).get(username),

  findAdmin: () =>
    db.prepare('SELECT id, username, email, balance FROM users WHERE is_admin = 1 LIMIT 1').get(),

  updateAvatar: (id, avatar) =>
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, id),

  updateBio: (id, bio) =>
    db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, id),

  updateBalance: (id, delta) =>
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(delta, id),

  freeze: (id, amount) =>
    db.prepare('UPDATE users SET balance = balance - ?, frozen = frozen + ? WHERE id = ?')
      .run(amount, amount, id),

  unfreeze: (id, amount) =>
    db.prepare('UPDATE users SET frozen = frozen - ? WHERE id = ?').run(amount, id),

  payout: (id, amount) =>
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, id),

  refreshRating: (id) => {
    const row = db.prepare('SELECT AVG(rating) AS avg, COUNT(*) AS cnt FROM reviews WHERE target_id = ?').get(id);
    db.prepare('UPDATE users SET rating = ?, reviews_count = ? WHERE id = ?')
      .run(+(row.avg || 5).toFixed(2), row.cnt, id);
  },

  incrementDeals: (id) =>
    db.prepare('UPDATE users SET deals_count = deals_count + 1 WHERE id = ?').run(id),
};

export const productsRepo = {
  all: () =>
    db.prepare(`
      SELECT p.*, u.username AS seller_name, u.rating AS seller_rating,
             u.reviews_count AS seller_reviews, u.avatar AS seller_avatar
      FROM products p
      JOIN users u ON u.id = p.seller_id
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC
    `).all(),

  bySeller: (seller_id) =>
    db.prepare('SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC').all(seller_id),

  byId: (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id),

  create: (data) =>
    db.prepare(`
      INSERT INTO products
        (seller_id, title, description, price, game, category, subcategory, icon,
         transfer_type, login, password, account_id, comment,
         is_premium, auto_boost)
      VALUES (@seller_id, @title, @description, @price, @game, @category, @subcategory, @icon,
              @transfer_type, @login, @password, @account_id, @comment,
              @is_premium, @auto_boost)
    `).run(data),

  remove: (id, seller_id) =>
    db.prepare("UPDATE products SET status = 'removed' WHERE id = ? AND seller_id = ?").run(id, seller_id),
};

export const dealsRepo = {
  create: (data) =>
    db.prepare(`
      INSERT INTO deals
        (buyer_id, seller_id, product_id, product_title, amount, commission, payout, auto_confirm)
      VALUES (@buyer_id, @seller_id, @product_id, @product_title, @amount, @commission, @payout, @auto_confirm)
    `).run(data),

  byId: (id) => db.prepare('SELECT * FROM deals WHERE id = ?').get(id),

  byUser: (userId) =>
    db.prepare(`
      SELECT d.*, b.username AS buyer_name, b.avatar AS buyer_avatar,
             s.username AS seller_name, s.avatar AS seller_avatar,
             r.id AS review_id
      FROM deals d
      JOIN users b ON b.id = d.buyer_id
      JOIN users s ON s.id = d.seller_id
      LEFT JOIN reviews r ON r.deal_id = d.id
      WHERE d.buyer_id = ? OR d.seller_id = ?
      ORDER BY d.created_at DESC
    `).all(userId, userId),

  updateStatus: (id, status) =>
    db.prepare('UPDATE deals SET status = ?, confirmed_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id),

  pendingWithExpired: () =>
    db.prepare(`SELECT * FROM deals WHERE status = 'pending' AND auto_confirm <= datetime('now')`).all(),
};

export const reviewsRepo = {
  create: (data) =>
    db.prepare('INSERT INTO reviews (deal_id, author_id, target_id, rating, text) VALUES (@deal_id, @author_id, @target_id, @rating, @text)')
      .run(data),

  byTarget: (userId) =>
    db.prepare(`
      SELECT r.*, u.username AS author_name, u.avatar AS author_avatar
      FROM reviews r
      JOIN users u ON u.id = r.author_id
      WHERE r.target_id = ?
      ORDER BY r.created_at DESC
    `).all(userId),

  forDeal: (dealId) => db.prepare('SELECT * FROM reviews WHERE deal_id = ?').get(dealId),
};

export const txRepo = {
  create: (data) =>
    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, status, method, description)
      VALUES (@user_id, @type, @amount, @status, @method, @description)
    `).run({
      user_id: data.user_id,
      type: data.type,
      amount: data.amount,
      status: data.status || 'success',
      method: data.method || '',
      description: data.description || ''
    }),

  byUser: (userId) =>
    db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 200').all(userId),
};

export default db;

// Миграция для уведомлений
try {
  const msgCols = db.prepare("PRAGMA table_info(messages)").all().map(c => c.name);
  if (!msgCols.includes('is_read')) {
    db.exec("ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0");
    console.log('[DB] Добавлена колонка is_read в messages');
  }
} catch (e) {
  console.error('[DB] Ошибка миграции:', e.message);
}

// Таблицы для техподдержки
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS support_chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS support_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES support_chats(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    );
  `);
  console.log('[DB] Таблицы поддержки готовы');
} catch (e) {
  console.error('[DB] Ошибка создания таблиц поддержки:', e.message);
}


// Миграция для подтверждения почты
try {
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('is_verified_email')) {
    db.exec("ALTER TABLE users ADD COLUMN is_verified_email INTEGER DEFAULT 0");
  }
  if (!userCols.includes('verify_code')) {
    db.exec("ALTER TABLE users ADD COLUMN verify_code TEXT");
  }
  console.log('[DB] Поля для почты готовы');
} catch (e) {
  console.error('[DB] Ошибка миграции почты:', e.message);
}

// Миграция для ролей и других недостающих колонок
try {
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('role')) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
    db.exec("UPDATE users SET role = 'admin' WHERE email = 'admin@games.shop'");
    console.log('[DB] Добавлена колонка role');
  }
  if (!userCols.includes('is_banned')) {
    db.exec("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0");
    db.exec("ALTER TABLE users ADD COLUMN ban_reason TEXT");
    console.log('[DB] Добавлены колонки is_banned и ban_reason');
  }
} catch (e) {
  console.error('[DB] Ошибка миграции ролей:', e.message);
}


// Финальная миграция для Railway
try {
  // Добавляем колонки, если их нет
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('role')) db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
  if (!userCols.includes('is_banned')) db.exec("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0");
  if (!userCols.includes('is_verified_email')) db.exec("ALTER TABLE users ADD COLUMN is_verified_email INTEGER DEFAULT 0");
  if (!userCols.includes('verify_code')) db.exec("ALTER TABLE users ADD COLUMN verify_code TEXT");
  
  // Создаем таблицы поддержки, если их нет
  db.exec(`
    CREATE TABLE IF NOT EXISTS support_chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS support_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES support_chats(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    );
  `);
  console.log('[DB] Экстренная миграция завершена');
} catch (e) {
  console.error('[DB] Ошибка экстренной миграции:', e.message);
}

// Автоматическое создание и заполнение категорий для игр
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      title TEXT NOT NULL,
      icon TEXT DEFAULT 'fas fa-box',
      commission INTEGER DEFAULT 15,
      color TEXT DEFAULT '#2196f3'
    );
  `);

  // Проверяем, пустая ли таблица
  const count = db.prepare("SELECT COUNT(*) c FROM game_categories").get().c;
  
  if (count === 0) {
    const insert = db.prepare("INSERT INTO game_categories (game_id, title, icon, commission, color) VALUES (?, ?, ?, ?, ?)");
    const games = ['pubg', 'brawl', 'standoff2', 'roblox', 'minecraft', 'cs2', 'dota2', 'valorant', 'rust', 'apex'];
    
    for (const g of games) {
      insert.run(g, 'Аккаунты', 'fas fa-user', 15, '#3b82f6');
      insert.run(g, 'Игровая валюта', 'fas fa-coins', 10, '#f59e0b');
      insert.run(g, 'Бусты', 'fas fa-rocket', 15, '#f97316');
      insert.run(g, 'Услуги', 'fas fa-hands-helping', 15, '#06b6d4');
    }
    console.log('[DB] Категории для всех игр успешно добавлены');
  }
} catch (e) {
  console.error('[DB] Ошибка миграции категорий:', e.message);
}

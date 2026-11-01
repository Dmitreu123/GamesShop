import jwt from 'jsonwebtoken';
import db from './db.js'; // <-- Добавили импорт базы данных

const JWT_SECRET = process.env.JWT_SECRET || 'games-shop-dev-secret-change-me';
const JWT_EXPIRES = '7d';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    
    // Проверка на бан
    const user = db.prepare('SELECT is_banned, role FROM users WHERE id = ?').get(payload.id);
    if (user && user.is_banned) {
      return res.status(403).json({ error: 'Аккаунт заблокирован администратором' });
    }
    
    req.user = payload;
    req.user.role = user ? user.role : 'user'; // Добавляем роль для проверки
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
}

export function authOptional(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
}

// --- НОВАЯ ФУНКЦИЯ ДЛЯ ПРОВЕРКИ АДМИНА ---
export function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    // Пропускаем, если роль admin ИЛИ почта совпадает с админской
    if (req.user.role !== 'admin' && req.user.email !== 'admin@games.shop') {
      return res.status(403).json({ error: 'Доступ только для администратора' });
    }
    next();
  });
}

export function adminOrModeratorRequired(req, res, next) {
  authRequired(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator' && req.user.email !== 'admin@games.shop') {
      return res.status(403).json({ error: 'Доступ только для администрации' });
    }
    next();
  });
}

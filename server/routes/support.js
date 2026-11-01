import express from 'express';
import db from '../db.js';
import { authRequired } from '../auth.js';

const router = express.Router();

// 1. Получить или создать чат поддержки
router.get('/chat', authRequired, (req, res) => {
    // Ищем открытый чат пользователя
    let chat = db.prepare("SELECT * FROM support_chats WHERE user_id = ? AND status = 'open'").get(req.user.id);
    
    // Если нет - создаем новый
    if (!chat) {
        const result = db.prepare("INSERT INTO support_chats (user_id) VALUES (?)").run(req.user.id);
        chat = { id: result.lastInsertRowid, user_id: req.user.id, status: 'open' };
        
        // Находим админа для отправки приветствия от его имени
        const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
        if (admin) {
            db.prepare("INSERT INTO support_messages (chat_id, sender_id, text) VALUES (?, ?, ?)")
              .run(chat.id, admin.id, 'Здравствуйте! Вы обратились в техподдержку Games Shop. Опишите вашу проблему, и модератор скоро ответит вам.');
        }
    }
    res.json({ chat });
});

// 2. Получить сообщения
router.get('/messages', authRequired, (req, res) => {
    const chat = db.prepare("SELECT * FROM support_chats WHERE user_id = ? AND status = 'open'").get(req.user.id);
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });

    const messages = db.prepare(`
        SELECT m.*, u.username, u.avatar, u.role 
        FROM support_messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.chat_id = ?
        ORDER BY m.id ASC
    `).all(chat.id);

    res.json({ messages });
});

// 3. Отправить сообщение
router.post('/message', authRequired, (req, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Пустое сообщение' });

    const chat = db.prepare("SELECT * FROM support_chats WHERE user_id = ? AND status = 'open'").get(req.user.id);
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });

    db.prepare("INSERT INTO support_messages (chat_id, sender_id, text) VALUES (?, ?, ?)")
      .run(chat.id, req.user.id, text);

    res.json({ ok: true });
});

export default router;

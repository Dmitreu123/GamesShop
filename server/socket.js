/* ==========================================================
   Socket.IO — чат внутри сделок в реальном времени
   ========================================================== */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { dealsRepo } from './db.js';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'games-shop-dev-secret-change-me';

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Требуется авторизация'));
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('Неверный токен'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`💬 Socket подключён: user#${userId}`);

    socket.on('join_deal', ({ deal_id }) => {
      const deal = dealsRepo.byId(Number(deal_id));
      if (!deal) return;
      if (deal.buyer_id !== userId && deal.seller_id !== userId) return;

      const room = `deal_${deal.id}`;
      socket.join(room);
      socket.emit('joined', { deal_id: deal.id });
      console.log(`  → user#${userId} зашёл в ${room}`);
    });

    socket.on('leave_deal', ({ deal_id }) => {
      socket.leave(`deal_${deal_id}`);
    });

    socket.on('send_message', ({ deal_id, text }) => {
      const deal = dealsRepo.byId(Number(deal_id));
      if (!deal) return;
      if (deal.buyer_id !== userId && deal.seller_id !== userId) return;

      const clean = String(text || '').trim().slice(0, 2000);
      if (!clean) return;

      const result = db.prepare('INSERT INTO messages (deal_id, sender_id, text) VALUES (?, ?, ?)')
        .run(deal.id, userId, clean);

      const msg = db.prepare(`
        SELECT m.*, u.username AS sender_name, u.avatar AS sender_avatar
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.id = ?
      `).get(result.lastInsertRowid);

      io.to(`deal_${deal.id}`).emit('new_message', msg);
    });

    socket.on('typing', ({ deal_id }) => {
      socket.to(`deal_${deal_id}`).emit('user_typing', {
        user_id: userId,
        username: socket.user.username
      });
    });

    socket.on('disconnect', () => {
      console.log(`💬 Socket отключён: user#${userId}`);
    });
  });

  console.log('💬 Socket.IO запущен');

  return io;
}

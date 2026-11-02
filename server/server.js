import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

import './db.js';
import { initDb } from './db-pg.js';
import { startEscrowWorker, startAutoBoostWorker } from './escrow.js';

import adminRouter from './routes/admin.js';
import usersRouter    from './routes/users.js';
import walletRouter   from './routes/wallet.js';
import dealsRouter    from './routes/deals.js';
import reviewsRouter  from './routes/reviews.js';
import gamesRouter    from './routes/games.js';
import productsRouter from './routes/products.js';
import sellersRouter  from './routes/sellers.js';
import ordersRouter   from './routes/orders.js';
import messagesRouter from './routes/messages.js';
import chatsRouter from './routes/chats.js';
import { setupSocket } from './socket.js';
import supportRouter from './routes/support.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/users',    usersRouter);
app.use('/api/wallet',   walletRouter);
app.use('/api/deals',    dealsRouter);
app.use('/api/reviews',  reviewsRouter);
app.use('/api/games',    gamesRouter);
app.use('/api/products', productsRouter);
app.use('/api/sellers',  sellersRouter);
app.use('/api/orders',   ordersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/support', supportRouter);

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

const distPath   = path.join(__dirname, '..', 'dist');
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => { if (err) next(); });
});

startEscrowWorker();
startAutoBoostWorker();

const httpServer = http.createServer(app);
setupSocket(httpServer);

if (process.env.DATABASE_URL) {
  initDb().catch(err => {
    console.error('Ошибка инициализации БД:', err);
    process.exit(1);
  });
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Games Shop: http://localhost:${PORT}`);
});

import { Router } from 'express';
import db from '../db.js';

const router = Router();

/* ==========================================================
   Список игр для маркетплейса
   type: 'mobile' | 'desktop' — для табов
   popular: true — показывать в топе
   ========================================================== */

const DEFAULT_RULES = {
  requirements: [
    'Покупатель будет единственным владельцем, на аккаунте нет посторонних игроков',
    'На аккаунте нет вечной или временной блокировки',
    'На аккаунте нет других ограничений, либо они указаны в описании',
    'Минимум 1 из 10 скриншотов должен содержать ID игрового аккаунта'
  ],
  forbidden: [
    'Запрещено продавать аккаунт с неполным доступом к привязкам',
    'Запрещено сдавать аккаунт в аренду в этой категории',
    'Запрещено продавать аккаунт с привязкой iCloud'
  ]
};

const GAMES = [
  {
    id: 'pubg', name: 'PUBG Mobile', icon: 'https://cdn.cloudflare.steamstatic.com/steam/apps/578080/header.jpg', color: '#f59e0b',
    type: 'mobile', popular: true,
    categories: ['accounts', 'uc', 'boosts', 'skins', 'services'],
    rules: DEFAULT_RULES
  },
  {
id: 'brawl', name: 'Brawl Stars', icon: '/games/brawl.jpg', color: '#84cc16',
    type: 'mobile', popular: true,
    categories: ['accounts', 'gems', 'boosts', 'skins', 'services'],
    rules: DEFAULT_RULES
  },
  {
id: 'standoff2', name: 'Standoff 2', icon: '/games/standoff.jpg', color: '#f97316',
type: 'mobile', popular: true,
    categories: ['accounts', 'gold', 'skins', 'boosts', 'services'],
    rules: DEFAULT_RULES
  },
  {
id: 'roblox', name: 'Roblox', icon: '/games/roblox.jpg', color: '#ef4444',
    type: 'mobile', popular: true,
    categories: ['accounts', 'robux', 'items', 'services'],
    rules: DEFAULT_RULES
  },
  {
id: 'minecraft', name: 'Minecraft', icon: '/games/minecraft.jpg', color: '#16a34a',
    type: 'mobile', popular: true,
    categories: ['accounts', 'servers', 'items', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'cs2', name: 'Counter-Strike 2', icon: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg', color: '#f59e0b',
    type: 'desktop', popular: true,
    categories: ['accounts', 'skins', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'dota2', name: 'Dota 2', icon: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg', color: '#ef4444',
    type: 'desktop', popular: true,
    categories: ['accounts', 'items', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'valorant', name: 'Valorant', icon: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg', color: '#ef4444',
    type: 'desktop', popular: true,
    categories: ['accounts', 'vp', 'skins', 'boosts', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'rust', name: 'Rust', icon: 'https://cdn.cloudflare.steamstatic.com/steam/apps/252490/header.jpg', color: '#a16207',
    type: 'desktop', popular: true,
    categories: ['accounts', 'items', 'skins', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'apex', name: 'Apex Legends', icon: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg', color: '#dc2626',
    type: 'desktop', popular: false,
    categories: ['accounts', 'coins', 'skins', 'boosts', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'other', name: 'Другая игра', icon: 'fas fa-gamepad', color: '#6b7280',
    type: 'other', popular: false,
    categories: ['accounts', 'items', 'services', 'other'],
    rules: DEFAULT_RULES
  }
];

/* GET /api/games — все игры */
router.get('/', (req, res) => {
  res.json(GAMES);
});


/* GET /api/games/:id/categories - категории для игры из БД */
router.get('/:id/categories', (req, res) => {
  try {
    const gameId = req.params.id;
    const game = GAMES.find(g => g.id === gameId);
    
    // Берем категории из базы данных
    const categories = db.prepare("SELECT * FROM game_categories WHERE game_id = ?").all(gameId);
    
    res.json({
      game: game ? { id: game.id, name: game.name, icon: game.icon, color: game.color } : { id: gameId, name: 'Игра' },
      categories: categories.length > 0 ? categories : [{ id: 'accounts', title: 'Аккаунты', icon: 'fas fa-user' }]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

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
id: 'brawl', name: 'Brawl Stars', icon: 'https://cdn1.epicgames.com/spt-assets/b8c3f9c4e6c24fdd888c1a1e7f6a2d02/brawl-stars-1g7j3.jpg', color: '#84cc16',
    type: 'mobile', popular: true,
    categories: ['accounts', 'gems', 'boosts', 'skins', 'services'],
    rules: {
      requirements: [
        'Аккаунт передаётся с полным доступом к Supercell ID',
        'Указать количество бравлеров и максимальный ранг',
        'Минимум 1 скриншот — с ником и тегом игрока'
      ],
      forbidden: [
        'Запрещено продавать аккаунт с активной подпиской Brawl Pass',
        'Запрещено продавать аккаунт с привязкой к другому Supercell ID'
      ]
    }
  },
  {
    id: 'standoff2', name: 'Standoff 2', icon: 'https://play-lh.googleusercontent.com/_qQ4p9C8X1Y3q5Q4p9C8X1Y3q5Q4p9C8X1Y3q5Q=s180', color: '#f97316',
    type: 'mobile', popular: true,
    categories: ['accounts', 'gold', 'skins', 'boosts', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'mobilelegends', name: 'Mobile Legends', icon: 'fas fa-shield-alt', color: '#3b82f6',
    type: 'mobile', popular: false,
    categories: ['accounts', 'diamonds', 'skins', 'boosts', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'genshin', name: 'Genshin Impact', icon: 'fas fa-hat-wizard', color: '#a855f7',
    type: 'mobile', popular: false,
    categories: ['accounts', 'primogems', 'skins', 'boosts', 'services'],
    rules: DEFAULT_RULES
  },
  {
id: 'roblox', name: 'Roblox', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Roblox_player_icon_black.svg/1200px-Roblox_player_icon_black.svg.png', color: '#ef4444',
    type: 'mobile', popular: true,
    categories: ['accounts', 'robux', 'items', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'clash', name: 'Clash of Clans', icon: 'fas fa-chess-rook', color: '#eab308',
    type: 'mobile', popular: false,
    categories: ['accounts', 'gems', 'boosts', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'clashroyale', name: 'Clash Royale', icon: 'fas fa-crown', color: '#06b6d4',
    type: 'mobile', popular: false,
    categories: ['accounts', 'gems', 'boosts', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'freefire', name: 'Free Fire', icon: 'fas fa-fire', color: '#dc2626',
    type: 'mobile', popular: false,
    categories: ['accounts', 'diamonds', 'skins', 'boosts', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'codm', name: 'Call of Duty Mobile', icon: 'fas fa-bomb', color: '#65a30d',
    type: 'mobile', popular: false,
    categories: ['accounts', 'cp', 'skins', 'boosts', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'fortnite', name: 'Fortnite', icon: 'fas fa-hammer', color: '#7c3aed',
    type: 'mobile', popular: false,
    categories: ['accounts', 'v-bucks', 'skins', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'minecraft', name: 'Minecraft', icon: 'fas fa-cube', color: '#16a34a',
    type: 'mobile', popular: true,
    categories: ['accounts', 'servers', 'items', 'services'],
    rules: DEFAULT_RULES
  },
  {

id: 'cs2', name: 'Counter-Strike 2', icon: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg', color: '#f59e0b',    type: 'desktop', popular: true,
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
    id: 'steam', name: 'Steam', icon: 'fab fa-steam', color: '#3b82f6',
    type: 'desktop', popular: true,
    categories: ['accounts', 'keys', 'gifts', 'services'],
    rules: {
      requirements: [
        'Аккаунт передаётся с полным доступом к почте',
        'Указывать количество игр и общую стоимость',
        'На аккаунте нет VAC-бана'
      ],
      forbidden: [
        'Запрещено продавать аккаунт без смены почты',
        'Запрещено продавать аккаунт с активной подпиской Steam Guard, если нет доступа к телефону'
      ]
    }
  },
  {
    id: 'valorant', name: 'Valorant', icon: 'fas fa-crosshairs', color: '#ef4444',
    type: 'desktop', popular: true,
    categories: ['accounts', 'vp', 'skins', 'boosts', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'gta', name: 'GTA V Online', icon: 'fas fa-car', color: '#22c55e',
    type: 'desktop', popular: false,
    categories: ['accounts', 'money', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'wow', name: 'World of Warcraft', icon: 'fas fa-dragon', color: '#eab308',
    type: 'desktop', popular: false,
    categories: ['accounts', 'gold', 'boosts', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'rust', name: 'Rust', icon: 'fas fa-hammer', color: '#a16207',
    type: 'desktop', popular: false,
    categories: ['accounts', 'items', 'skins', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'apex', name: 'Apex Legends', icon: 'fas fa-crosshairs', color: '#dc2626',
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
    const gameId = req.params.id; // Берем ID как строку (pubg, cs2 и т.д.)

    // Ищем игру в твоем жестком массиве GAMES
    const game = GAMES.find(g => g.id === gameId);

    // Берем категории из базы данных
    const categories = db.prepare("SELECT * FROM game_categories WHERE game_id = ?").all(gameId);

    res.json({
      game: game ? { id: game.id, name: game.name, icon: game.icon, color: game.color } : { id: gameId, name: 'Игра', icon: 'fas fa-gamepad', color: '#2196f3' },
      categories: categories.length > 0 ? categories : [
        { id: 'accounts', title: 'Аккаунты', icon: 'fas fa-user', color: '#2196f3' }
      ],
      rules: game ? (game.rules || {}) : {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

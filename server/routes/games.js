import { Router } from 'express';

const router = Router();

/* ==========================================================
   Список игр для маркетплейса
   type: 'mobile' | 'desktop' — для табов
   popular: true — показывать в топе
   categories: список того, что можно продавать в игре
   ========================================================== */


/* ==========================================================
   Список игр с категориями и правилами
   ========================================================== */

const CATEGORY_NAMES = {
  accounts:  { name: 'Аккаунты',           icon: 'fas fa-user-circle', color: '#3b82f6' },
  uc:        { name: 'UC (PUBG)',          icon: 'fas fa-coins',       color: '#f59e0b' },
  gems:      { name: 'Гемы',               icon: 'fas fa-gem',         color: '#84cc16' },
  diamonds:  { name: 'Алмазы',             icon: 'fas fa-gem',         color: '#06b6d4' },
  gold:      { name: 'Золото',             icon: 'fas fa-coins',       color: '#eab308' },
  robux:     { name: 'Robux',              icon: 'fas fa-cube',        color: '#ef4444' },
  primogems: { name: 'Примогемы',          icon: 'fas fa-star',        color: '#a855f7' },
  cp:        { name: 'CP (CoD)',           icon: 'fas fa-coins',       color: '#65a30d' },
  'v-bucks': { name: 'V-Bucks',            icon: 'fas fa-coins',       color: '#7c3aed' },
  coins:     { name: 'Монеты',             icon: 'fas fa-coins',       color: '#dc2626' },
  vp:        { name: 'VP (Valorant)',      icon: 'fas fa-coins',       color: '#ef4444' },
  money:     { name: 'Деньги',             icon: 'fas fa-dollar-sign', color: '#22c55e' },
  mmr:       { name: 'MMR (Dota)',         icon: 'fas fa-trophy',      color: '#dc2626' },
  skins:     { name: 'Скины / Предметы',   icon: 'fas fa-gem',         color: '#a855f7' },
  items:     { name: 'Предметы',           icon: 'fas fa-box',         color: '#8b5cf6' },
  boosts:    { name: 'Бусты',              icon: 'fas fa-rocket',      color: '#f97316' },
  keys:      { name: 'Ключи',              icon: 'fas fa-key',         color: '#eab308' },
  gifts:     { name: 'Подарки',            icon: 'fas fa-gift',        color: '#ec4899' },
  servers:   { name: 'Сервера',            icon: 'fas fa-server',      color: '#16a34a' },
  services:  { name: 'Услуги',             icon: 'fas fa-hands-helping', color: '#06b6d4' },
  other:     { name: 'Другое',             icon: 'fas fa-ellipsis-h',  color: '#6b7280' }
};

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
    id: 'pubg', name: 'PUBG Mobile', icon: 'fas fa-parachute-box', color: '#f59e0b',
    type: 'mobile', popular: true,
    categories: ['accounts', 'uc', 'boosts', 'skins', 'services'],
    rules: DEFAULT_RULES
  },
  {
    id: 'brawl', name: 'Brawl Stars', icon: 'fas fa-star', color: '#84cc16',
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
    id: 'standoff2', name: 'Standoff 2', icon: 'fas fa-crosshairs', color: '#f97316',
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
    id: 'roblox', name: 'Roblox', icon: 'fas fa-cube', color: '#ef4444',
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
    id: 'cs2', name: 'CS2', icon: 'fas fa-crosshairs', color: '#f59e0b',
    type: 'desktop', popular: true,
    categories: ['accounts', 'skins', 'boosts', 'services'],
    rules: {
      requirements: [
        'Аккаунт с полным доступом к Steam и почте',
        'На аккаунте нет VAC-бана и трейд-бана',
        'Указывать Prime-статус и часы в игре'
      ],
      forbidden: [
        'Запрещено продавать аккаунт с активным трейд-холдом',
        'Запрещено продавать аккаунт без доступа к почте'
      ]
    }
  },
  {
    id: 'dota2', name: 'Dota 2', icon: 'fas fa-shield-alt', color: '#dc2626',
    type: 'desktop', popular: true,
    categories: ['accounts', 'items', 'mmr', 'boosts', 'services'],
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

/* GET /api/games/:id — одна игра */
router.get('/:id', (req, res) => {
  const game = GAMES.find(g => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'Игра не найдена' });
  res.json(game);
});

/* GET /api/games/:id/categories — категории для игры */
router.get('/:id/categories', (req, res) => {
  const game = GAMES.find(g => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'Игра не найдена' });

  const categories = (game.categories || []).map(catId => ({
    id: catId,
    ...(CATEGORY_NAMES[catId] || { name: catId, icon: 'fas fa-box', color: '#6b7280' })
  }));

  res.json({
    game: { id: game.id, name: game.name, icon: game.icon, color: game.color },
    categories,
    rules: game.rules || DEFAULT_RULES
  });
});

export default router;

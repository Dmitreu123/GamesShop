import { Router } from 'express';

const router = Router();

const sellers = [
  { name: 'Alex_Games', rating: '4.9', deals: '1 340' },
  { name: 'MegaStore',  rating: '5.0', deals: '980' },
  { name: 'GameKeyPro', rating: '4.8', deals: '2 170' },
  { name: 'NinjaBoost', rating: '4.9', deals: '760' }
];

router.get('/', (req, res) => res.json(sellers));

export default router;
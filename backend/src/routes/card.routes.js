import { Router } from 'express';
import { getCardDetails, listCards } from '../controllers/cardController.js';
import { optionalAuth } from '../middlewares/authMiddlewares.js';
import { validateCardListQuery, validateCardParams } from '../middlewares/validateCardParams.js';

const router = Router();

router.get('/', validateCardListQuery, listCards);

router.get('/:id', validateCardParams, optionalAuth, getCardDetails);

export default router;

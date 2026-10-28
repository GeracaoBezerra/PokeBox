import { Router } from 'express';
import { getCardDetails, listCards } from '../controllers/cardController.js';
import { validateCardListQuery, validateCardParams } from '../middlewares/validateCardParams.js';

const router = Router();

router.get('/', validateCardListQuery, listCards);

router.get('/:id', validateCardParams, getCardDetails);

export default router;

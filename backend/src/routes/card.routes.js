import { Router } from 'express';
import { getCardDetails, listCards } from '../controllers/cardController.js';
import { validateCardListQuery, validateCardParams } from '../middlewares/validateCardParams.js';

export function createCardRoutes(auth) {
  const router = Router();

  router.get('/', validateCardListQuery, listCards);

  router.get('/:id', validateCardParams, auth.optionalAuth, getCardDetails);

  return router;
}

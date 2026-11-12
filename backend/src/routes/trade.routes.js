import { Router } from 'express';

import * as tradeController from '../controllers/tradeController.js';

export function createTradeRoutes(auth) {
  const router = Router();

  router.post('/', auth.requireAuth, tradeController.create);
  router.get('/me', auth.requireAuth, tradeController.listMine);
  router.get('/:id', auth.requireAuth, tradeController.getById);
  router.post('/:id/accept', auth.requireAuth, tradeController.accept);
  router.post('/:id/reject', auth.requireAuth, tradeController.reject);
  router.post('/:id/cancel', auth.requireAuth, tradeController.cancel);

  return router;
}

import { Router } from 'express';

import type { TradeController } from '../controllers/TradeController.js';
import type { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export function createTradeRoutes(auth: Pick<AuthMiddleware, 'requireAuth'>, controller: TradeController): Router {
  const router = Router();

  router.post('/', auth.requireAuth, controller.create);
  router.get('/me', auth.requireAuth, controller.listMine);
  router.get('/:id', auth.requireAuth, controller.getById);
  router.post('/:id/accept', auth.requireAuth, controller.accept);
  router.post('/:id/reject', auth.requireAuth, controller.reject);
  router.post('/:id/cancel', auth.requireAuth, controller.cancel);

  return router;
}

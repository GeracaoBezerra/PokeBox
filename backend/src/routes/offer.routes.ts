import { Router } from 'express';

import type { OfferController } from '../controllers/OfferController.js';
import type { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export function createOfferRoutes(auth: Pick<AuthMiddleware, 'requireAuth'>, controller: OfferController): Router {
  const router = Router();

  router.get('/me', auth.requireAuth, controller.listMine);
  router.get('/:id', auth.requireAuth, controller.getById);
  router.patch('/:id/status', auth.requireAuth, controller.changeStatus);

  return router;
}

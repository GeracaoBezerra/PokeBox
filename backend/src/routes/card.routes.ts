import { Router } from 'express';

import type { CardController } from '../controllers/CardController.js';
import type { AuthMiddleware } from '../middlewares/AuthMiddleware.js';
import { validateCardListQuery, validateCardParams } from '../middlewares/validateCardParams.js';

export function createCardRoutes(controller: CardController, auth: Pick<AuthMiddleware, 'optionalAuth'>): Router {
  const router = Router();

  router.get('/', validateCardListQuery, controller.list);

  router.get('/:id', validateCardParams, auth.optionalAuth, controller.getDetails);

  return router;
}

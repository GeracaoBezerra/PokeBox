import { Router, type RequestHandler } from 'express';

import type { ListingController } from '../controllers/ListingController.js';
import type { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export interface ListingOfferHandlers {
  create: RequestHandler;
}

export function createListingRoutes(
  auth: Pick<AuthMiddleware, 'requireAuth' | 'optionalAuth'>,
  controller: ListingController,
  offers: ListingOfferHandlers,
): Router {
  const router = Router();

  router.get('/', controller.list);
  router.get('/me', auth.requireAuth, controller.listMine);
  router.get('/:id', auth.optionalAuth, controller.getById);
  router.post('/', auth.requireAuth, controller.create);
  router.patch('/:id', auth.requireAuth, controller.update);
  router.post('/:id/offers', auth.requireAuth, offers.create);

  return router;
}

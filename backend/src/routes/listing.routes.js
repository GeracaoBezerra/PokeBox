import { Router } from 'express';

import * as listingController from '../controllers/listingController.js';
import * as offerController from '../controllers/offerController.js';

export function createListingRoutes(auth) {
  const router = Router();

  router.get('/', listingController.list);
  router.get('/me', auth.requireAuth, listingController.listMine);
  router.get('/:id', auth.optionalAuth, listingController.getById);
  router.post('/', auth.requireAuth, listingController.create);
  router.patch('/:id', auth.requireAuth, listingController.update);
  router.post('/:id/offers', auth.requireAuth, offerController.create);

  return router;
}

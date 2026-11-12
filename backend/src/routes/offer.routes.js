import { Router } from 'express';

import * as offerController from '../controllers/offerController.js';

export function createOfferRoutes(auth) {
  const router = Router();

  router.get('/me', auth.requireAuth, offerController.listMine);
  router.get('/:id', auth.requireAuth, offerController.getById);
  router.patch('/:id/status', auth.requireAuth, offerController.changeStatus);

  return router;
}

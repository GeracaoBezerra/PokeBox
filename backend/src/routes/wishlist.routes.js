import { Router } from 'express';

import * as wishlistController from '../controllers/wishlistController.js';

export function createWishlistRoutes(auth) {
  const router = Router();

  router.use(auth.requireAuth);

  router.get('/', wishlistController.list);
  router.post('/', wishlistController.add);
  router.delete('/:id', wishlistController.remove);

  return router;
}

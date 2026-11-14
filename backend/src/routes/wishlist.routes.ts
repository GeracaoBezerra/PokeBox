import { Router } from 'express';

import type { WishlistController } from '../controllers/WishlistController.js';
import type { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export function createWishlistRoutes(auth: Pick<AuthMiddleware, 'requireAuth'>, controller: WishlistController): Router {
  const router = Router();

  router.use(auth.requireAuth);

  router.get('/', controller.list);
  router.post('/', controller.add);
  router.delete('/:id', controller.remove);

  return router;
}

import { Router } from 'express';

import type { CollectionController } from '../controllers/CollectionController.js';
import type { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export function createCollectionRoutes(
  auth: Pick<AuthMiddleware, 'requireAuth'>,
  controller: CollectionController,
): Router {
  const router = Router();

  router.use(auth.requireAuth);

  router.get('/', controller.list);
  router.post('/', controller.add);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}

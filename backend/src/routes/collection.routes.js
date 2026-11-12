import { Router } from 'express';

import * as collectionController from '../controllers/collectionController.js';

export function createCollectionRoutes(auth) {
  const router = Router();

  router.use(auth.requireAuth);

  router.get('/', collectionController.list);
  router.post('/', collectionController.add);
  router.patch('/:id', collectionController.update);
  router.delete('/:id', collectionController.remove);

  return router;
}

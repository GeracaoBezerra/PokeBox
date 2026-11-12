import { Router } from 'express';

import * as profileController from '../controllers/profileController.js';

export function createUsersRoutes() {
  const router = Router();

  router.get('/:username/collection', profileController.publicCollection);

  return router;
}

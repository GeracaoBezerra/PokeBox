import { Router } from 'express';

import type { ProfileController } from '../controllers/ProfileController.js';

export function createUsersRoutes(controller: ProfileController): Router {
  const router = Router();

  router.get('/:username/collection', controller.publicCollection);

  return router;
}

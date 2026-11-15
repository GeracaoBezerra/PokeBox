import { Router } from 'express';

import type { UserController } from '../controllers/UserController.js';
import type { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export function createUserRoutes(auth: AuthMiddleware, controller: UserController): Router {
  const router = Router();

  router.patch('/me', auth.requireAuth, controller.updateMe);
  router.delete('/me', auth.requireAuth, controller.deleteMe);

  return router;
}

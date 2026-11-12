import { Router } from 'express';
import * as userController from '../controllers/userController.js';

export function createUserRoutes(auth) {
  const router = Router();

  router.patch('/me', auth.requireAuth, userController.updateMe);
  router.delete('/me', auth.requireAuth, userController.deleteMe);

  return router;
}

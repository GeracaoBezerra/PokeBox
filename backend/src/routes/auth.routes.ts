import { Router } from 'express';

import type { AuthController } from '../controllers/AuthController.js';
import type { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export function createAuthRoutes(auth: AuthMiddleware, controller: AuthController): Router {
  const router = Router();

  router.post('/register', controller.register);
  router.post('/login', controller.login);

  router.get('/me', auth.requireAuth, controller.me);

  router.get('/admin-check', auth.requireAuth, auth.requireRole('ADMIN'), (_req, res) => {
    res.status(200).json({ success: true, data: { message: 'acesso de admin ok' } });
  });

  return router;
}

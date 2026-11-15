import { Router, type RequestHandler } from 'express';

import type { AuthController } from '../controllers/AuthController.js';
import type { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export interface AuthLimiters {
  login: RequestHandler;
  register: RequestHandler;
}

export function createAuthRoutes(auth: AuthMiddleware, controller: AuthController, limiters: AuthLimiters): Router {
  const router = Router();

  router.post('/register', limiters.register, controller.register);
  router.post('/login', limiters.login, controller.login);

  router.get('/me', auth.requireAuth, controller.me);

  router.get('/admin-check', auth.requireAuth, auth.requireRole('ADMIN'), (_req, res) => {
    res.status(200).json({ success: true, data: { message: 'acesso de admin ok' } });
  });

  return router;
}

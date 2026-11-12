import { Router } from 'express';

import * as authController from '../controllers/authController.js';

export function createAuthRoutes(auth) {
  const router = Router();

  router.post('/register', authController.register);
  router.post('/login', authController.login);

  router.get('/me', auth.requireAuth, authController.me);

  router.get('/admin-check', auth.requireAuth, auth.requireRole('ADMIN'), (req, res) => {
    return res.status(200).json({ success: true, data: { message: 'acesso de admin ok' } });
  });

  return router;
}

// backend/src/routes/auth.routes.js
import { Router } from 'express';

import * as authController from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddlewares.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/me', requireAuth, authController.me);

router.get('/admin-check', requireAuth, requireRole('ADMIN'), (req, res) => {
  return res.status(200).json({ success: true, data: { message: 'acesso de admin ok' } });
});

export default router;
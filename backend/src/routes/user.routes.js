import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { requireAuth } from '../middlewares/authMiddlewares.js';

const router = Router();

router.patch('/me', requireAuth, userController.updateMe);
router.delete('/me', requireAuth, userController.deleteMe);

export default router;
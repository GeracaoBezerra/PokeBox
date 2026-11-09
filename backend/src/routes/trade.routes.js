import { Router } from 'express';

import * as tradeController from '../controllers/tradeController.js';
import { requireAuth } from '../middlewares/authMiddlewares.js';

const router = Router();

router.post('/', requireAuth, tradeController.create);
router.get('/me', requireAuth, tradeController.listMine);
router.get('/:id', requireAuth, tradeController.getById);
router.post('/:id/accept', requireAuth, tradeController.accept);
router.post('/:id/reject', requireAuth, tradeController.reject);
router.post('/:id/cancel', requireAuth, tradeController.cancel);

export default router;

import { Router } from 'express';

import * as offerController from '../controllers/offerController.js';
import { requireAuth } from '../middlewares/authMiddlewares.js';

const router = Router();

router.get('/me', requireAuth, offerController.listMine);
router.get('/:id', requireAuth, offerController.getById);
router.patch('/:id/status', requireAuth, offerController.changeStatus);

export default router;

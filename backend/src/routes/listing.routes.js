import { Router } from 'express';

import * as listingController from '../controllers/listingController.js';
import { optionalAuth, requireAuth } from '../middlewares/authMiddlewares.js';

const router = Router();

router.get('/', listingController.list);
router.get('/me', requireAuth, listingController.listMine);
router.get('/:id', optionalAuth, listingController.getById);
router.post('/', requireAuth, listingController.create);
router.patch('/:id', requireAuth, listingController.update);

export default router;

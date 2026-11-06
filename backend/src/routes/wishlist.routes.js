import { Router } from 'express';

import * as wishlistController from '../controllers/wishlistController.js';
import { requireAuth } from '../middlewares/authMiddlewares.js';

const router = Router();

router.use(requireAuth);

router.get('/', wishlistController.list);
router.post('/', wishlistController.add);
router.delete('/:id', wishlistController.remove);

export default router;

import { Router } from 'express';

import * as collectionController from '../controllers/collectionController.js';
import { requireAuth } from '../middlewares/authMiddlewares.js';

const router = Router();

router.use(requireAuth);

router.get('/', collectionController.list);
router.post('/', collectionController.add);
router.patch('/:id', collectionController.update);
router.delete('/:id', collectionController.remove);

export default router;

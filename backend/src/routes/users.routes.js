import { Router } from 'express';

import * as profileController from '../controllers/profileController.js';

const router = Router();

router.get('/:username/collection', profileController.publicCollection);

export default router;

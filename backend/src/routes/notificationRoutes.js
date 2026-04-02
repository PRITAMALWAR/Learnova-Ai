import { Router } from 'express';
import { list, markAllRead, markOneRead, seedDemo } from '../controllers/notificationController.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', list);
router.patch('/all/read', markAllRead);
router.patch('/:id/read', markOneRead);
router.post('/demo', seedDemo);

export default router;

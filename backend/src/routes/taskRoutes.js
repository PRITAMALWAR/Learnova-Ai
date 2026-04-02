import { Router } from 'express';
import { body } from 'express-validator';
import { today, range, updateTask, analytics } from '../controllers/taskController.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/today', today);
router.get('/range', range);
router.get('/analytics', analytics);
router.patch(
  '/:id',
  [
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'skipped']),
    body('progress').optional().isInt({ min: 0, max: 100 }),
  ],
  updateTask
);

export default router;

import { Router } from 'express';
import { body } from 'express-validator';
import { list, create, update, remove } from '../controllers/subjectController.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', list);
router.post(
  '/',
  [body('name').trim().notEmpty(), body('isWeak').optional().isBoolean(), body('colorKey').optional()],
  create
);
router.patch('/:id', [body('name').optional().trim(), body('isWeak').optional().isBoolean()], update);
router.delete('/:id', remove);

export default router;

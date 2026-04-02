import { Router } from 'express';
import { body } from 'express-validator';
import { updateProfile } from '../controllers/userController.js';
import { authRequired, loadUser } from '../middleware/auth.js';

const router = Router();

router.patch(
  '/profile',
  authRequired,
  loadUser,
  [
    body('name').optional().trim(),
    body('examTrack').optional().trim(),
    body('targetExamDate').optional().isISO8601(),
    body('hoursPerDay').optional().isInt({ min: 1, max: 16 }),
    body('studyPreference').optional().trim(),
  ],
  updateProfile
);

export default router;

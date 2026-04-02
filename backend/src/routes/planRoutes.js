import { Router } from 'express';
import { body } from 'express-validator';
import { generate, latest, pdf, weakInsight } from '../controllers/planController.js';
import { authRequired, loadUser } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.post(
  '/generate',
  loadUser,
  [
    body('subjectNames').optional().isArray(),
    body('weakSubjectNames').optional().isArray(),
    body('hoursPerDay').optional().isFloat({ min: 1, max: 16 }),
    body('examDate').optional().isISO8601(),
    body('studyPreferenceLabel').optional().trim(),
    body('targetScore').optional().isNumeric(),
    body('breakStyle').optional().trim(),
    body('additionalNotes').optional().trim(),
  ],
  generate
);

router.get('/latest', latest);
router.get('/weak-insight', weakInsight);
router.get('/:id/pdf', pdf);

export default router;

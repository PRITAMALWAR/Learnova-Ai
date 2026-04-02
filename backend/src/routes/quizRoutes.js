import { Router } from 'express';
import { body } from 'express-validator';
import {
  getLimits,
  startQuiz,
  submitQuiz,
  history,
  profileQuizStats,
} from '../controllers/quizController.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/limits', getLimits);
router.get('/history', history);
router.get('/profile-stats', profileQuizStats);

router.post(
  '/start',
  [
    body('subject')
      .customSanitizer((v) => (v === undefined || v === null ? '' : String(v).trim()))
      .notEmpty()
      .withMessage('subject is required'),
    body('questionCount')
      .optional()
      .custom((v) => {
        if (v === undefined || v === null || v === '') return true;
        const n = Number(v);
        return Number.isInteger(n) && n >= 5 && n <= 12;
      })
      .withMessage('questionCount must be an integer from 5 to 12'),
  ],
  startQuiz
);

router.post(
  '/submit',
  [
    body('sessionId')
      .customSanitizer((v) => (v === undefined || v === null ? '' : String(v).trim()))
      .notEmpty()
      .withMessage('sessionId is required'),
    body('answers').isArray({ min: 1 }).withMessage('answers must be a non-empty array'),
  ],
  submitQuiz
);

export default router;

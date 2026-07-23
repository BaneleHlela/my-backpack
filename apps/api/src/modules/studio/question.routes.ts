// Question router — mounted at /api/dashboard/questions. Platform-admin only.
import { Router, IRouter } from 'express';
import { requireProfile, requirePlatformAdmin } from '../auth/auth.middleware';
import {
  createQuestionHandler,
  updateQuestionHandler,
  deleteQuestionHandler,
  listQuestionsHandler,
} from './question.controller';

const router: IRouter = Router();

router.use(requireProfile, requirePlatformAdmin);

// POST /api/dashboard/questions
router.post('/', createQuestionHandler);

// GET /api/dashboard/questions?courseId=&search=
router.get('/', listQuestionsHandler);

// PATCH /api/dashboard/questions/:questionId
router.patch('/:questionId', updateQuestionHandler);

// DELETE /api/dashboard/questions/:questionId
router.delete('/:questionId', deleteQuestionHandler);

export default router;

// Quiz router — mounted at /api/dashboard/quizzes. Platform-admin only.
// (POST /api/dashboard/nodes/:nodeId/quizzes lives on node.routes.ts — see node.routes.ts.)
import { Router, IRouter } from 'express';
import { requireProfile, requirePlatformAdmin } from '../auth/auth.middleware';
import {
  updateQuizHandler,
  updateQuizQuestionsHandler,
  deleteQuizHandler,
} from './quiz.controller';

const router: IRouter = Router();

router.use(requireProfile, requirePlatformAdmin);

// PATCH /api/dashboard/quizzes/:quizId
router.patch('/:quizId', updateQuizHandler);

// PATCH /api/dashboard/quizzes/:quizId/questions
router.patch('/:quizId/questions', updateQuizQuestionsHandler);

// DELETE /api/dashboard/quizzes/:quizId
router.delete('/:quizId', deleteQuizHandler);

export default router;

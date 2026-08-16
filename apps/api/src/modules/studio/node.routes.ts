// Node router — mounted at /api/dashboard/nodes. Platform-admin only.
// (POST /api/dashboard/courses/:courseId/nodes and the reorder route live on
// course.routes.ts — see course.routes.ts.)
import { Router, IRouter } from 'express';
import { requireProfile, requirePlatformAdmin } from '../auth/auth.middleware';
import {
  updateNodeHandler,
  deleteNodeHandler,
  updateNodeItemGradeSettingsHandler,
  createNodeBookQuestionsHandler,
} from './node.controller';
import { createLessonHandler } from './lesson.controller';
import { createQuizHandler } from './quiz.controller';

const router: IRouter = Router();

router.use(requireProfile, requirePlatformAdmin);

// PATCH /api/dashboard/nodes/:nodeId
router.patch('/:nodeId', updateNodeHandler);

// DELETE /api/dashboard/nodes/:nodeId
router.delete('/:nodeId', deleteNodeHandler);

// POST /api/dashboard/nodes/:nodeId/lessons
router.post('/:nodeId/lessons', createLessonHandler);

// POST /api/dashboard/nodes/:nodeId/quizzes
router.post('/:nodeId/quizzes', createQuizHandler);

// PATCH /api/dashboard/nodes/:nodeId/items/:itemId/grade-settings — quiz items only
router.patch('/:nodeId/items/:itemId/grade-settings', updateNodeItemGradeSettingsHandler);

// POST /api/dashboard/nodes/:nodeId/book-questions — book-to-course pipeline, Phase 4a
router.post('/:nodeId/book-questions', createNodeBookQuestionsHandler);

export default router;

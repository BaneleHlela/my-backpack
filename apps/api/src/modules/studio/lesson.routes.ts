// Lesson router — mounted at /api/dashboard/lessons. Platform-admin only.
// (POST /api/dashboard/nodes/:nodeId/lessons lives on node.routes.ts — see node.routes.ts.)
import { Router, IRouter } from 'express';
import { requireProfile, requirePlatformAdmin } from '../auth/auth.middleware';
import { updateLessonHandler, deleteLessonHandler } from './lesson.controller';

const router: IRouter = Router();

router.use(requireProfile, requirePlatformAdmin);

// PATCH /api/dashboard/lessons/:lessonId
router.patch('/:lessonId', updateLessonHandler);

// DELETE /api/dashboard/lessons/:lessonId
router.delete('/:lessonId', deleteLessonHandler);

export default router;

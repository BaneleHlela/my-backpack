// Roadmap router — all routes mounted at /api/roadmap.
// All routes require a full JWT (requireProfile).
import { Router, IRouter } from 'express';
import { requireProfile } from '../auth/auth.middleware';
import {
  getRoadmapByMiniAppHandler,
  getRoadmapBySubjectHandler,
  getNodeHandler,
  getLessonHandler,
  markLessonStudyViewedHandler,
  startQuizItemHandler,
  completeQuizItemHandler,
} from './roadmap.controller';

const router: IRouter = Router();

// GET /api/roadmap/:miniAppId — roadmap by miniApp with nodes, items, and profile progress
router.get('/:miniAppId', requireProfile, getRoadmapByMiniAppHandler);

// GET /api/roadmap/subject/:subjectId — roadmap by subject with nodes, items, and progress
router.get('/subject/:subjectId', requireProfile, getRoadmapBySubjectHandler);

// GET /api/roadmap/node/:nodeId — node details with ordered items and progress
router.get('/node/:nodeId', requireProfile, getNodeHandler);

// GET /api/roadmap/lesson/:lessonId — lesson details with resources and progress
router.get('/lesson/:lessonId', requireProfile, getLessonHandler);

// POST /api/roadmap/lesson/:lessonId/study — mark lesson resources viewed (unconditional auto-complete)
router.post('/lesson/:lessonId/study', requireProfile, markLessonStudyViewedHandler);

// POST /api/roadmap/node/:nodeId/item/:itemId/start — start quiz session for a quiz item
router.post('/node/:nodeId/item/:itemId/start', requireProfile, startQuizItemHandler);

// POST /api/roadmap/node/:nodeId/item/:itemId/complete — complete a quiz item { sessionId }
router.post('/node/:nodeId/item/:itemId/complete', requireProfile, completeQuizItemHandler);

export default router;

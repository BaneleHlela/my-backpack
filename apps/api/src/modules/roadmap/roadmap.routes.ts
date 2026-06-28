// Roadmap router — all routes mounted at /api/roadmap.
// All routes require a full JWT (requireProfile).
import { Router, IRouter } from 'express';
import { requireProfile } from '../auth/auth.middleware';
import { attachContentPrefs } from '../../middleware/ageGroup.middleware';
import {
  getRoadmapByMiniAppHandler,
  getRoadmapBySubjectHandler,
  getNodeHandler,
  getLessonHandler,
  markLessonStudyViewedHandler,
  startLessonHandler,
  completeLessonHandler,
} from './roadmap.controller';

const router: IRouter = Router();

// GET /api/roadmap/:miniAppId — roadmap by miniApp with nodes, lessons, and profile progress
router.get('/:miniAppId', requireProfile, attachContentPrefs, getRoadmapByMiniAppHandler);

// GET /api/roadmap/subject/:subjectId — roadmap by subject with nodes, lessons, and progress
router.get('/subject/:subjectId', requireProfile, attachContentPrefs, getRoadmapBySubjectHandler);

// GET /api/roadmap/node/:nodeId — node details with ordered lessons and progress
router.get('/node/:nodeId', requireProfile, attachContentPrefs, getNodeHandler);

// GET /api/roadmap/lesson/:lessonId — lesson details with study material, questions, progress
router.get('/lesson/:lessonId', requireProfile, attachContentPrefs, getLessonHandler);

// POST /api/roadmap/lesson/:lessonId/study — mark study material viewed (auto-completes intro lessons)
router.post('/lesson/:lessonId/study', requireProfile, markLessonStudyViewedHandler);

// POST /api/roadmap/lesson/:lessonId/start — start quiz session for this lesson
router.post('/lesson/:lessonId/start', requireProfile, startLessonHandler);

// POST /api/roadmap/lesson/:lessonId/complete — complete lesson { sessionId }
router.post('/lesson/:lessonId/complete', requireProfile, completeLessonHandler);

export default router;

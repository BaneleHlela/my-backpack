// Roadmap router — all routes mounted at /api/roadmap.
// All routes require a full JWT (requireProfile). GET routes also attach content prefs.
import { Router, IRouter } from 'express';
import { requireProfile } from '../auth/auth.middleware';
import { attachContentPrefs } from '../../middleware/ageGroup.middleware';
import {
  getRoadmapHandler,
  getNodeHandler,
  markStudyViewedHandler,
  startAssessmentHandler,
  completeAssessmentHandler,
} from './roadmap.controller';

const router: IRouter = Router();

// GET /api/roadmap/:miniAppId — full roadmap with node list and profile progress
router.get('/:miniAppId', requireProfile, attachContentPrefs, getRoadmapHandler);

// GET /api/roadmap/node/:nodeId — node details, study material, questions, progress
router.get('/node/:nodeId', requireProfile, attachContentPrefs, getNodeHandler);

// POST /api/roadmap/node/:nodeId/study — mark study material as viewed
router.post('/node/:nodeId/study', requireProfile, markStudyViewedHandler);

// POST /api/roadmap/node/:nodeId/start — start assessment (creates QuizSession)
router.post('/node/:nodeId/start', requireProfile, startAssessmentHandler);

// POST /api/roadmap/node/:nodeId/complete — complete assessment { sessionId }
router.post('/node/:nodeId/complete', requireProfile, completeAssessmentHandler);

export default router;

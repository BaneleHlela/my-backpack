// Quiz router — all routes mounted at /api/quiz.
// All routes require a full JWT (requireProfile).
import { Router, IRouter } from 'express';
import { requireProfile } from '../auth/auth.middleware';
import {
  createSessionHandler,
  captureAnswerHandler,
  completeSessionHandler,
  abandonSessionHandler,
  getSessionResultsHandler,
  getSessionStateHandler,
} from './quiz.controller';

const router: IRouter = Router();

// POST /api/quiz/session  { miniAppId, settings? }
router.post('/session', requireProfile, createSessionHandler);

// POST /api/quiz/session/:sessionId/answer
router.post('/session/:sessionId/answer', requireProfile, captureAnswerHandler);

// PATCH /api/quiz/session/:sessionId/complete
router.patch('/session/:sessionId/complete', requireProfile, completeSessionHandler);

// PATCH /api/quiz/session/:sessionId/abandon
router.patch('/session/:sessionId/abandon', requireProfile, abandonSessionHandler);

// GET /api/quiz/session/:sessionId
router.get('/session/:sessionId', requireProfile, getSessionStateHandler);

// GET /api/quiz/session/:sessionId/results
router.get('/session/:sessionId/results', requireProfile, getSessionResultsHandler);

export default router;

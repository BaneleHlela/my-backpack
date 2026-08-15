// Quiz router — all routes mounted at /api/quiz.
// All routes require a full JWT (requireProfile).
import { Router, IRouter } from 'express';
import { requireProfile } from '../auth/auth.middleware';
import {
  createSessionHandler,
  listQuizzesHandler,
  hasQuizContentHandler,
  captureAnswerHandler,
  completeSessionHandler,
  abandonSessionHandler,
  getSessionResultsHandler,
  getSessionStateHandler,
  getSessionReviewHandler,
  listQuizHistoryHandler,
  getHistoryFilterOptionsHandler,
} from './quiz.controller';

const router: IRouter = Router();

// GET /api/quiz/quizzes?miniAppId=
router.get('/quizzes', requireProfile, listQuizzesHandler);

// GET /api/quiz/has-content?miniAppId=
router.get('/has-content', requireProfile, hasQuizContentHandler);

// GET /api/quiz/history?contextId=&nodeId=&status=&page=&limit= — Quiz History list
router.get('/history', requireProfile, listQuizHistoryHandler);

// GET /api/quiz/history/filters — Quiz History filter dropdown options
router.get('/history/filters', requireProfile, getHistoryFilterOptionsHandler);

// POST /api/quiz/session  { miniAppId | quizId, settings? }
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

// GET /api/quiz/session/:sessionId/review — full per-question breakdown for Quiz History
router.get('/session/:sessionId/review', requireProfile, getSessionReviewHandler);

export default router;

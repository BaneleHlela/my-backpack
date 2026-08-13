// AI Chat router — all routes mounted at /api/ai-chat.
// Backs Course Chat's AI Helper: a 1:1, course-scoped chat between a profile and Claude Haiku.
// Every route requires a full profile JWT. attachContentPrefs is only needed on send-message,
// to read ageGroup/simplifiedLanguage for the system prompt.
import { Router, IRouter } from 'express';
import { requireProfile } from '../auth/auth.middleware';
import { attachContentPrefs } from '../../middleware/ageGroup.middleware';
import { getChatHistoryHandler, sendChatMessageHandler } from './aiChat.controller';

const router: IRouter = Router();

// GET /api/ai-chat/course/:courseId/history
router.get('/course/:courseId/history', requireProfile, getChatHistoryHandler);

// POST /api/ai-chat/course/:courseId/message  { message }
router.post('/course/:courseId/message', requireProfile, attachContentPrefs, sendChatMessageHandler);

export default router;

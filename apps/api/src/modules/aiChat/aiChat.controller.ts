// Route handlers for /api/ai-chat — delegates to aiChat.service.
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { AppError, catchAsync } from '../../utils/AppError';
import { getChatHistory, sendChatMessage, getPracticeQuestionsForProfile } from './aiChat.service';
import { SendMessageDto } from './aiChat.types';

export const getChatHistoryHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const courseId = req.params['courseId'] as string;
  const messages = await getChatHistory(profileId, courseId);
  sendSuccess(res, { messages });
});

export const sendChatMessageHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const courseId = req.params['courseId'] as string;
  const { message } = req.body as Partial<SendMessageDto>;
  if (!message || typeof message !== 'string') {
    throw new AppError('message is required', 400);
  }

  const result = await sendChatMessage({
    profileId,
    courseId,
    message,
    contentPrefs: req.contentPrefs,
  });
  sendSuccess(res, result, 201);
});

// POST /api/ai-chat/course/:courseId/practice-questions — book-to-course pipeline, Phase 4b.
// Empty body. Generates personal, on-demand practice questions from the learner's current
// chapter — see aiChat.service.ts's getPracticeQuestionsForProfile.
export const getPracticeQuestionsHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const courseId = req.params['courseId'] as string;
  const questions = await getPracticeQuestionsForProfile(profileId, courseId);
  sendSuccess(res, { questions }, 201);
});

// Route handlers for /api/quiz — delegates to quizSession.service.
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { AppError, catchAsync } from '../../utils/AppError';
import {
  createQuizSession,
  captureAnswer,
  completeSession,
  abandonSession,
  getSessionResults,
  getSessionState,
} from '../../services/quizSession.service';
import { listQuizzes, hasQuizContent } from './quiz.service';
import Quiz from '../../models/learning/quiz.model';
import { CreateSessionDto, CaptureAnswerDto, ListQuizzesQuery, HasQuizContentQuery } from './quiz.types';

export const createSessionHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const { miniAppId, settings } = req.body as Partial<CreateSessionDto>;
  if (!miniAppId) throw new AppError('miniAppId is required', 400);

  const quiz = await Quiz.findOne({ miniAppId, isDefault: true, isActive: true });
  if (!quiz) throw new AppError('No default quiz configured for this mini-app', 404);

  try {
    const { session, firstQuestion } = await createQuizSession(
      profileId,
      quiz._id.toString(),
      settings ?? {}
    );
    sendSuccess(res, { session, firstQuestion }, 201);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to create session', 400);
  }
});

export const listQuizzesHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { miniAppId } = req.query as Partial<ListQuizzesQuery>;
  if (!miniAppId) throw new AppError('miniAppId is required', 400);

  const quizzes = await listQuizzes(miniAppId);
  sendSuccess(res, { quizzes });
});

export const hasQuizContentHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const { miniAppId } = req.query as Partial<HasQuizContentQuery>;
  if (!miniAppId) throw new AppError('miniAppId is required', 400);

  const hasContent = await hasQuizContent(miniAppId, profileId);
  sendSuccess(res, { hasContent });
});

export const captureAnswerHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const sessionId = req.params['sessionId'] as string;
  const body = req.body as Partial<CaptureAnswerDto>;

  if (
    !body.questionId ||
    !body.responseType ||
    body.rawResponse === undefined ||
    body.timeToAnswerMs === undefined
  ) {
    throw new AppError('questionId, responseType, rawResponse and timeToAnswerMs are required', 400);
  }

  try {
    const result = await captureAnswer(sessionId, profileId, {
      questionId: body.questionId,
      responseType: body.responseType,
      rawResponse: body.rawResponse,
      selectedOptionIndex: body.selectedOptionIndex,
      timeToAnswerMs: body.timeToAnswerMs,
      wasTimedOut: body.wasTimedOut,
      wasSkipped: body.wasSkipped,
    });
    sendSuccess(res, result);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to capture answer', 400);
  }
});

export const completeSessionHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const sessionId = req.params['sessionId'] as string;

  try {
    const session = await completeSession(sessionId, profileId);
    sendSuccess(res, session);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to complete session', 400);
  }
});

export const abandonSessionHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const sessionId = req.params['sessionId'] as string;

  try {
    const session = await abandonSession(sessionId, profileId);
    sendSuccess(res, session);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to abandon session', 400);
  }
});

export const getSessionResultsHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const sessionId = req.params['sessionId'] as string;

  try {
    const session = await getSessionResults(sessionId, profileId);
    sendSuccess(res, session);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to fetch session results', 500);
  }
});

export const getSessionStateHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const sessionId = req.params['sessionId'] as string;

  try {
    const result = await getSessionState(sessionId, profileId);
    sendSuccess(res, result);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to fetch session', 404);
  }
});

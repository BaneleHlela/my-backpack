// HTTP handlers for roadmap routes. Thin layer — all logic lives in roadmap.service.ts.
import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import {
  getRoadmapWithProgress,
  getNodeWithProgress,
  getLessonWithProgress,
  markLessonStudyViewed,
  startLesson,
  completeLesson,
} from './roadmap.service';

export async function getRoadmapByMiniAppHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const miniAppId = req.params['miniAppId'] as string;
    const result = await getRoadmapWithProgress(profileId, miniAppId, undefined);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load roadmap';
    sendError(res, message, 404);
  }
}

export async function getRoadmapBySubjectHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const subjectId = req.params['subjectId'] as string;
    const result = await getRoadmapWithProgress(profileId, undefined, subjectId);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load roadmap';
    sendError(res, message, 404);
  }
}

export async function getNodeHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const nodeId = req.params['nodeId'] as string;
    const result = await getNodeWithProgress(nodeId, profileId);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load node';
    sendError(res, message, 404);
  }
}

export async function getLessonHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const lessonId = req.params['lessonId'] as string;
    const allowedTypes = req.contentPrefs?.allowedQuestionTypes;
    const result = await getLessonWithProgress(lessonId, profileId, allowedTypes);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load lesson';
    sendError(res, message, 404);
  }
}

export async function markLessonStudyViewedHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const lessonId = req.params['lessonId'] as string;
    const result = await markLessonStudyViewed(lessonId, profileId);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark study viewed';
    sendError(res, message, 400);
  }
}

export async function startLessonHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const lessonId = req.params['lessonId'] as string;
    const result = await startLesson(lessonId, profileId);
    sendSuccess(res, result, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start lesson';
    const status = message === 'Lesson is locked' ? 403 : 400;
    sendError(res, message, status);
  }
}

export async function completeLessonHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const lessonId = req.params['lessonId'] as string;
    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId) {
      sendError(res, 'sessionId is required', 400);
      return;
    }
    const result = await completeLesson(lessonId, profileId, sessionId);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to complete lesson';
    sendError(res, message, 400);
  }
}

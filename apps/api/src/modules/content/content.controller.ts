// Route handlers for /api/content — content navigation (subjects, topics, mini-apps).
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { AppError, catchAsync } from '../../utils/AppError';
import {
  getActiveSubjects,
  getTopicsBySubjectSlug,
  getMiniAppsByTopicSlug,
  getMiniAppBySlug,
} from './content.service';

export const getSubjectsHandler = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const subjects = await getActiveSubjects();
    sendSuccess(res, subjects);
  }
);

export const getTopicsHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const slug = req.params['slug'] as string;
    try {
      const topics = await getTopicsBySubjectSlug(slug);
      sendSuccess(res, topics);
    } catch (err) {
      throw new AppError(err instanceof Error ? err.message : 'Failed to fetch topics', 404);
    }
  }
);

export const getMiniAppsHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const slug = req.params['slug'] as string;
    try {
      const miniApps = await getMiniAppsByTopicSlug(slug);
      sendSuccess(res, miniApps);
    } catch (err) {
      throw new AppError(err instanceof Error ? err.message : 'Failed to fetch mini-apps', 404);
    }
  }
);

export const getMiniAppHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const slug = req.params['slug'] as string;
    try {
      const miniApp = await getMiniAppBySlug(slug);
      sendSuccess(res, miniApp);
    } catch (err) {
      throw new AppError(err instanceof Error ? err.message : 'Mini-app not found', 404);
    }
  }
);

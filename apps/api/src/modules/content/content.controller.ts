// Route handlers for /api/content — content navigation (fields, subjects, topics, mini-apps).
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { catchAsync } from '../../utils/AppError';
import {
  getFields,
  getSubjectsByField,
  getTopicsBySubject,
  getMiniAppsByTopic,
  getMiniAppBySlug,
} from './content.service';

export const getFieldsHandler = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const fields = await getFields();
    sendSuccess(res, fields);
  }
);

export const getSubjectsHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { fieldSlug } = req.params as { fieldSlug: string };
    const subjects = await getSubjectsByField(fieldSlug);
    sendSuccess(res, subjects);
  }
);

export const getTopicsHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { fieldSlug, subjectSlug } = req.params as { fieldSlug: string; subjectSlug: string };
    const topics = await getTopicsBySubject(fieldSlug, subjectSlug);
    sendSuccess(res, topics);
  }
);

export const getMiniAppsHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { fieldSlug, subjectSlug, topicSlug } = req.params as {
      fieldSlug: string;
      subjectSlug: string;
      topicSlug: string;
    };
    const miniApps = await getMiniAppsByTopic(fieldSlug, subjectSlug, topicSlug);
    sendSuccess(res, miniApps);
  }
);

export const getMiniAppHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { fieldSlug, subjectSlug, topicSlug, miniAppSlug } = req.params as {
      fieldSlug: string;
      subjectSlug: string;
      topicSlug: string;
      miniAppSlug: string;
    };
    const result = await getMiniAppBySlug(fieldSlug, subjectSlug, topicSlug, miniAppSlug);
    sendSuccess(res, result);
  }
);

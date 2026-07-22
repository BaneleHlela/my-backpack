// Route handlers for /api/content — content navigation (fields, subjects, courses, mini-apps).
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { catchAsync } from '../../utils/AppError';
import {
  getFields,
  getSubjectsByField,
  getCoursesBySubject,
  getCourseBySlug,
  getMiniAppsBySubject,
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

export const getCoursesHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { fieldSlug, subjectSlug } = req.params as { fieldSlug: string; subjectSlug: string };
    const courses = await getCoursesBySubject(fieldSlug, subjectSlug);
    sendSuccess(res, courses);
  }
);

export const getCourseHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { fieldSlug, subjectSlug, courseSlug } = req.params as {
      fieldSlug: string;
      subjectSlug: string;
      courseSlug: string;
    };
    const course = await getCourseBySlug(fieldSlug, subjectSlug, courseSlug);
    sendSuccess(res, course);
  }
);

export const getMiniAppsHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { fieldSlug, subjectSlug } = req.params as { fieldSlug: string; subjectSlug: string };
    const miniApps = await getMiniAppsBySubject(fieldSlug, subjectSlug);
    sendSuccess(res, miniApps);
  }
);

export const getMiniAppHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { fieldSlug, subjectSlug, miniAppSlug } = req.params as {
      fieldSlug: string;
      subjectSlug: string;
      miniAppSlug: string;
    };
    const result = await getMiniAppBySlug(fieldSlug, subjectSlug, miniAppSlug);
    sendSuccess(res, result);
  }
);

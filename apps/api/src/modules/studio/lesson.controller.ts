// Route handlers for Content Studio Lesson CRUD. Thin layer — logic lives in lesson.service.ts.
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { catchAsync } from '../../utils/AppError';
import {
  createLesson,
  updateLesson,
  deleteLesson,
  CreateLessonInput,
  UpdateLessonInput,
} from './lesson.service';

export const createLessonHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { nodeId } = req.params as { nodeId: string };
    const input = req.body as CreateLessonInput;
    const lesson = await createLesson(nodeId, input);
    sendSuccess(res, lesson, 201);
  }
);

export const updateLessonHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { lessonId } = req.params as { lessonId: string };
    const input = req.body as UpdateLessonInput;
    const lesson = await updateLesson(lessonId, input);
    sendSuccess(res, lesson);
  }
);

export const deleteLessonHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { lessonId } = req.params as { lessonId: string };
    await deleteLesson(lessonId);
    sendSuccess(res, { message: 'Lesson deleted' });
  }
);

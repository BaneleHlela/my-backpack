// Route handlers for Content Studio course CRUD. Thin layer — logic lives in course.service.ts.
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { catchAsync } from '../../utils/AppError';
import {
  createCourse,
  updateCourse,
  deleteCourse,
  CreateCourseInput,
  UpdateCourseInput,
} from './course.service';

export const createCourseHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const input = req.body as CreateCourseInput;
    const course = await createCourse(input);
    sendSuccess(res, course, 201);
  }
);

export const updateCourseHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params as { courseId: string };
    const input = req.body as UpdateCourseInput;
    const course = await updateCourse(courseId, input);
    sendSuccess(res, course);
  }
);

export const deleteCourseHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params as { courseId: string };
    await deleteCourse(courseId);
    sendSuccess(res, { message: 'Course deleted' });
  }
);

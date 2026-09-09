// Route handlers for Content Studio course CRUD. Thin layer — logic lives in course.service.ts.
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { catchAsync } from '../../utils/AppError';
import {
  createCourse,
  updateCourse,
  deleteCourse,
  suggestBookStructure,
  applyBookChapters,
  toDashboardCourseResponse,
  CreateCourseInput,
  UpdateCourseInput,
} from './course.service';

export const createCourseHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const input = req.body as CreateCourseInput;
    const course = await createCourse(input);
    sendSuccess(res, toDashboardCourseResponse(course), 201);
  }
);

export const updateCourseHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params as { courseId: string };
    const input = req.body as UpdateCourseInput;
    const course = await updateCourse(courseId, input);
    sendSuccess(res, toDashboardCourseResponse(course));
  }
);

export const deleteCourseHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params as { courseId: string };
    await deleteCourse(courseId);
    sendSuccess(res, { message: 'Course deleted' });
  }
);

// POST /api/dashboard/courses/:courseId/suggest-structure — book-to-course pipeline, Phase 2.
// Body: { pdfPath }. Extracts the PDF's text (mechanical) then asks Claude to propose a
// chapter list mirroring the book's own structure (judgment). Persists nothing — the frontend
// holds the response (chapters + extractedText) in memory and submits an edited version back
// to book-chapters below.
export const suggestStructureHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params as { courseId: string };
    const { pdfPath } = req.body as { pdfPath: string };
    const result = await suggestBookStructure(courseId, pdfPath);
    sendSuccess(res, result);
  }
);

// POST /api/dashboard/courses/:courseId/book-chapters — book-to-course pipeline, Phase 3.
// Body: { pdfPath, extractedText, chapters }. The admin-approved (possibly edited) version of
// suggest-structure's proposal. Sets Course.bookSource and creates one node + draft reading
// lesson per chapter — no quizzes yet, see POST /nodes/:nodeId/book-questions for that.
export const applyBookChaptersHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params as { courseId: string };
    const { pdfPath, extractedText, chapters } = req.body as {
      pdfPath: string;
      extractedText: string;
      chapters: { title: string; startPage?: number; endPage?: number }[];
    };
    const course = await applyBookChapters(courseId, { pdfPath, extractedText, chapters });
    sendSuccess(res, toDashboardCourseResponse(course));
  }
);

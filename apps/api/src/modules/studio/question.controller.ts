// Route handlers for Content Studio Question CRUD. Thin layer — logic lives in question.service.ts.
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { AppError, catchAsync } from '../../utils/AppError';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listQuestions,
  CreateQuestionInput,
  UpdateQuestionInput,
} from './question.service';

export const createQuestionHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const input = req.body as CreateQuestionInput;
    const question = await createQuestion(input);
    sendSuccess(res, question, 201);
  }
);

export const updateQuestionHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { questionId } = req.params as { questionId: string };
    const input = req.body as UpdateQuestionInput;
    const question = await updateQuestion(questionId, input);
    sendSuccess(res, question);
  }
);

export const deleteQuestionHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { questionId } = req.params as { questionId: string };
    await deleteQuestion(questionId);
    sendSuccess(res, { message: 'Question deleted' });
  }
);

export const listQuestionsHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { courseId, search } = req.query as { courseId?: string; search?: string };
    if (!courseId) throw new AppError('courseId query parameter is required', 400);

    const questions = await listQuestions(courseId, search);
    sendSuccess(res, questions);
  }
);

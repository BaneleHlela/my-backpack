// Route handlers for Content Studio Quiz CRUD. Thin layer — logic lives in quiz.service.ts.
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { catchAsync } from '../../utils/AppError';
import {
  createQuiz,
  updateQuiz,
  updateQuizQuestions,
  deleteQuiz,
  CreateQuizInput,
  UpdateQuizInput,
} from './quiz.service';

export const createQuizHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { nodeId } = req.params as { nodeId: string };
    const input = req.body as CreateQuizInput;
    const quiz = await createQuiz(nodeId, input);
    sendSuccess(res, quiz, 201);
  }
);

export const updateQuizHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { quizId } = req.params as { quizId: string };
    const input = req.body as UpdateQuizInput;
    const quiz = await updateQuiz(quizId, input);
    sendSuccess(res, quiz);
  }
);

export const updateQuizQuestionsHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { quizId } = req.params as { quizId: string };
    const { questionIds } = req.body as { questionIds: string[] };
    const quiz = await updateQuizQuestions(quizId, questionIds);
    sendSuccess(res, quiz);
  }
);

export const deleteQuizHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { quizId } = req.params as { quizId: string };
    await deleteQuiz(quizId);
    sendSuccess(res, { message: 'Quiz deleted' });
  }
);

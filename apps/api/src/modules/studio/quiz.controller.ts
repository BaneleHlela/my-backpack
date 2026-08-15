// Route handlers for Content Studio Quiz CRUD. Thin layer — logic lives in quiz.service.ts.
import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { catchAsync } from '../../utils/AppError';
import { resolveGradeSettings } from '../../utils/gradeSettings';
import {
  createQuiz,
  getQuiz,
  updateQuiz,
  updateQuizQuestions,
  deleteQuiz,
  CreateQuizInput,
  UpdateQuizInput,
} from './quiz.service';
import { findNodeByItemId } from './node.service';

export const createQuizHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { nodeId } = req.params as { nodeId: string };
    const input = req.body as CreateQuizInput;
    const quiz = await createQuiz(nodeId, input);
    sendSuccess(res, quiz, 201);
  }
);

// Merges the owning node item's grade settings (passingScore/starThresholds — see
// gradeSettings.ts) into the quiz response, resolved to always-defined values. These fields
// live on the RoadmapNode item ref, not on the Quiz document itself (a Quiz can be reused
// outside roadmaps), but QuizEditorPage edits both together as one "Grade Settings" section, so
// it's fetched together here rather than adding a second round-trip on the frontend.
// `nodeId`/`itemId` are null when this quiz isn't attached to any node item (shouldn't happen
// for anything reachable from QuizEditorPage, but the mode:'dynamic'/'pool' quizzes this
// endpoint could technically also be pointed at aren't node items).
export const getQuizHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { quizId } = req.params as { quizId: string };
    const quiz = await getQuiz(quizId);
    const node = await findNodeByItemId(quizId);
    const ref = node?.items.find((i) => i.itemId.toString() === quizId);
    const gradeSettings = ref ? resolveGradeSettings(ref.passingScore, ref.starThresholds) : null;
    sendSuccess(res, { ...quiz.toObject(), nodeId: node?._id ?? null, gradeSettings });
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

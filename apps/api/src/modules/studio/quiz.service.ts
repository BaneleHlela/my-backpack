// Business logic for Content Studio Quiz CRUD. Quizzes created here are always mode:'fixed'
// with miniAppId set to the owning Course's `_id` (there's no MiniApp document for roadmap
// content — see docs/content/content-studio-design.md). questionCount always tracks
// questionIds.length rather than being its own editable field, for mode:'fixed' quizzes.
import { Types } from 'mongoose';
import Quiz, { IQuizDocument, IQuizSettings } from '../../models/learning/quiz.model';
import RoadmapNode from '../../models/learning/roadmapNode.model';
import Course from '../../models/core/course.model';
import Question from '../../models/apps/language/vocabulary/question.model';
import { AppError } from '../../utils/AppError';
import { removeNodeItem, findNodeByItemId } from './node.service';

const DEFAULT_QUIZ_SETTINGS: IQuizSettings = {
  questionCount: 0,
  questionTypes: [],
  bucketFilter: 'all',
  feedbackMode: 'immediate',
  shuffleQuestions: false,
};

export interface CreateQuizInput {
  title: string;
  settings?: Partial<IQuizSettings>;
}

export async function createQuiz(nodeId: string, input: CreateQuizInput): Promise<IQuizDocument> {
  const node = await RoadmapNode.findOne({ _id: nodeId, isActive: true });
  if (!node) throw new AppError('Node not found', 404);

  const course = await Course.findOne({ roadmapId: node.roadmapId, isActive: true });
  if (!course) throw new AppError("Course not found for this node's roadmap", 404);

  const position = node.items.length + 1;

  const quiz = await Quiz.create({
    miniAppId: course._id,
    title: input.title,
    mode: 'fixed',
    questionIds: [],
    settings: { ...DEFAULT_QUIZ_SETTINGS, ...input.settings, questionCount: 0 },
    isUserAdjustable: false,
    isDefault: false,
  });

  await RoadmapNode.findByIdAndUpdate(node._id, {
    $push: { items: { itemType: 'quiz', itemId: quiz._id, position } },
  });

  return quiz;
}

export interface UpdateQuizInput {
  title?: string;
  settings?: Partial<IQuizSettings>;
}

export async function updateQuiz(quizId: string, input: UpdateQuizInput): Promise<IQuizDocument> {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new AppError('Quiz not found', 404);

  if (input.title !== undefined) quiz.title = input.title;
  if (input.settings !== undefined) {
    quiz.settings = { ...quiz.settings, ...input.settings, questionCount: quiz.questionIds.length };
  }

  await quiz.save();
  return quiz;
}

export async function updateQuizQuestions(quizId: string, questionIds: string[]): Promise<IQuizDocument> {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new AppError('Quiz not found', 404);

  if (questionIds.length) {
    const count = await Question.countDocuments({ _id: { $in: questionIds }, isActive: true });
    if (count !== questionIds.length) {
      throw new AppError('One or more questionIds do not exist or are inactive', 400);
    }
  }

  quiz.questionIds = questionIds.map((id) => new Types.ObjectId(id));
  quiz.settings.questionCount = questionIds.length;

  await quiz.save();
  return quiz;
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new AppError('Quiz not found', 404);

  quiz.isActive = false;
  await quiz.save();

  const node = await findNodeByItemId(quizId);
  if (node) {
    await removeNodeItem(node._id, quizId);
  }
}

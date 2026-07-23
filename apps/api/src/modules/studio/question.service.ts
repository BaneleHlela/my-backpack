// Business logic for Content Studio Question CRUD. v1 authoring is fully manual — no
// AI-assisted distractor/variant generation (see docs/content/content-studio-design.md).
// The Question schema's pre('validate') hook enforces per-type content shape (DnD needs
// draggables/dropZones, non-DnD needs prompt) — we don't duplicate that here, we just
// translate a failed save into a 400.
import { Error as MongooseError } from 'mongoose';
import Question, {
  IQuestionDocument,
  QuestionType,
  DEFAULT_MAX_POINTS,
} from '../../models/apps/language/vocabulary/question.model';
import Quiz from '../../models/learning/quiz.model';
import Course from '../../models/core/course.model';
import { IQuestionContent } from '../question/question.types';
import { AppError } from '../../utils/AppError';

function toAppError(err: unknown, fallbackMessage: string): AppError {
  if (err instanceof MongooseError.ValidationError) {
    return new AppError(err.message, 400);
  }
  return err instanceof AppError ? err : new AppError(fallbackMessage, 400);
}

export interface CreateQuestionInput {
  courseId: string;
  type: QuestionType;
  content: IQuestionContent;
  termId?: string;
  definitionId?: string;
  maxPoints?: number;
  pointsCanBePartial?: boolean;
}

export async function createQuestion(input: CreateQuestionInput): Promise<IQuestionDocument> {
  const course = await Course.findOne({ _id: input.courseId, isActive: true });
  if (!course) throw new AppError('Course not found', 404);

  try {
    return await Question.create({
      termId: input.termId,
      definitionId: input.definitionId,
      miniAppId: course._id,
      type: input.type,
      content: input.content,
      maxPoints: input.maxPoints ?? DEFAULT_MAX_POINTS[input.type],
      pointsCanBePartial: input.pointsCanBePartial ?? false,
      source: 'manual',
      isGeneric: true,
      profileId: null,
    });
  } catch (err) {
    throw toAppError(err, 'Failed to create question');
  }
}

export interface UpdateQuestionInput {
  content?: IQuestionContent;
  maxPoints?: number;
  pointsCanBePartial?: boolean;
}

export async function updateQuestion(
  questionId: string,
  input: UpdateQuestionInput
): Promise<IQuestionDocument> {
  const question = await Question.findById(questionId);
  if (!question) throw new AppError('Question not found', 404);

  if (input.content !== undefined) question.content = input.content;
  if (input.maxPoints !== undefined) question.maxPoints = input.maxPoints;
  if (input.pointsCanBePartial !== undefined) question.pointsCanBePartial = input.pointsCanBePartial;

  try {
    await question.save();
  } catch (err) {
    throw toAppError(err, 'Failed to update question');
  }

  return question;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const question = await Question.findById(questionId);
  if (!question) throw new AppError('Question not found', 404);

  question.isActive = false;
  await question.save();

  const referencingQuiz = await Quiz.findOne({ questionIds: questionId, isActive: true });
  if (referencingQuiz) {
    console.warn(
      `Question ${questionId} deactivated but is still referenced by active Quiz ${referencingQuiz._id}`
    );
  }
}

export async function listQuestions(courseId: string, search?: string): Promise<IQuestionDocument[]> {
  const filter: Record<string, unknown> = { miniAppId: courseId, isActive: true };

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [{ 'content.prompt': regex }, { 'content.correctAnswer': regex }];
  }

  return Question.find(filter).sort({ createdAt: -1 });
}

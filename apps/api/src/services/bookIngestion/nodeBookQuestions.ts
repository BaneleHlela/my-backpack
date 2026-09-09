// Phase 4a of the book-to-course pipeline: the official, Studio-triggered question generator.
// Generates AI questions from a node's rough proportional slice of the course's book text
// (chapterTextSlice.ts), saves them as real, shared Question documents (nodeId set explicitly —
// a deliberate divergence from studio/question.service.ts's createQuestion, which never sets
// nodeId; see docs/content/book-to-course-design.md), and wraps them in a new mode:'fixed' Quiz
// attached to the node in one write (skipping the two-step create-then-PATCH dance the
// hand-authoring UI uses). This is the curated, reviewed counterpart to Phase 4b's personal/
// on-demand practice-question chat action (chapterPracticeQuestions.ts via aiChat.service.ts).
import RoadmapNode, { IRoadmapNodeDocument } from '../../models/learning/roadmapNode.model';
import Course from '../../models/core/course.model';
import Roadmap from '../../models/learning/roadmap.model';
import Quiz, { IQuizSettings } from '../../models/learning/quiz.model';
import Question from '../../models/apps/language/vocabulary/question.model';
import { AppError } from '../../utils/AppError';
import { generateChapterQuestions } from './chapterQuestions';
import { sliceChapterText } from './chapterTextSlice';

const DEFAULT_QUIZ_SETTINGS: IQuizSettings = {
  questionCount: 0,
  questionTypes: [],
  bucketFilter: 'all',
  feedbackMode: 'immediate',
  shuffleQuestions: false,
};

const DEFAULT_QUESTION_COUNT = 8;

export async function createBookQuestionsForNode(
  nodeId: string,
  count: number = DEFAULT_QUESTION_COUNT
): Promise<IRoadmapNodeDocument> {
  const node = await RoadmapNode.findOne({ _id: nodeId, isActive: true });
  if (!node) throw new AppError('Node not found', 404);

  const roadmap = await Roadmap.findById(node.roadmapId);
  if (!roadmap) throw new AppError('Roadmap not found for this node', 404);

  const course = await Course.findOne({ roadmapId: node.roadmapId, isActive: true });
  if (!course) throw new AppError("Course not found for this node's roadmap", 404);
  if (!course.bookSource?.extractedText) {
    throw new AppError('This course has no book attached — nothing to generate questions from', 400);
  }

  const chapterText = await sliceChapterText(
    course.bookSource.extractedText,
    roadmap._id.toString(),
    nodeId
  );

  const generated = await generateChapterQuestions(chapterText, count);
  if (generated.length === 0) {
    throw new AppError('No valid questions were generated for this chapter — try again', 502);
  }

  const questions = await Question.insertMany(
    generated.map((q) => ({
      miniAppId: course._id,
      nodeId: node._id,
      type: q.type,
      content: q.content,
      maxPoints: q.maxPoints,
      pointsCanBePartial: false,
      source: 'ai' as const,
      isGeneric: true,
      profileId: null,
      isActive: true,
    }))
  );

  const position = node.items.length + 1;

  const quiz = await Quiz.create({
    miniAppId: course._id,
    title: `${node.title} — Practice Questions`,
    mode: 'fixed',
    questionIds: questions.map((q) => q._id),
    settings: { ...DEFAULT_QUIZ_SETTINGS, questionCount: questions.length },
    isUserAdjustable: false,
    isDefault: false,
  });

  await RoadmapNode.findByIdAndUpdate(node._id, {
    $push: { items: { itemType: 'quiz', itemId: quiz._id, position } },
  });

  const updated = await RoadmapNode.findById(node._id);
  if (!updated) throw new AppError('Node not found after update', 404);
  return updated;
}

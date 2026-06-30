// Math "Counting 1 to 10" practice/assessment questions. No Term backing — these are
// procedural counting drills, not vocabulary. Question documents are created directly,
// nodeId pointing at the counting node. Idempotent — re-running updates existing records.
import Question from '../../../models/apps/language/vocabulary/question.model';
import Subject from '../../../models/core/subject.model';
import Topic from '../../../models/core/topic.model';
import MiniApp from '../../../models/core/miniApp.model';
import Roadmap from '../../../models/learning/roadmap.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
import Lesson from '../../../models/learning/lesson.model';
import Quiz from '../../../models/learning/quiz.model';
import { IDraggable, IQuestionContent } from '../../../modules/question/question.types';

interface CountingQuestionData {
  target: number;
  applePool: number;
  distractors: { word: string; quantity: number }[];
  autoSubmit: boolean;
}

// Counts ramp from trivial (drag everything) to genuine "stop at the right number" judgement,
// then mix in non-apple and second-fruit distractors at the harder end. autoSubmit turns off
// from question 6 onward so the child must deliberately confirm the count rather than have the
// system end the question the instant the target is hit.
const countingData: CountingQuestionData[] = [
  { target: 1, applePool: 1, distractors: [], autoSubmit: true },
  { target: 2, applePool: 2, distractors: [], autoSubmit: true },
  { target: 3, applePool: 3, distractors: [], autoSubmit: true },
  { target: 4, applePool: 6, distractors: [], autoSubmit: true },
  { target: 5, applePool: 8, distractors: [], autoSubmit: true },
  { target: 6, applePool: 6, distractors: [{ word: 'car', quantity: 3 }], autoSubmit: false },
  { target: 7, applePool: 7, distractors: [{ word: 'car', quantity: 4 }], autoSubmit: false },
  { target: 8, applePool: 10, distractors: [{ word: 'car', quantity: 5 }], autoSubmit: false },
  {
    target: 9,
    applePool: 9,
    distractors: [
      { word: 'banana', quantity: 4 },
      { word: 'car', quantity: 2 },
    ],
    autoSubmit: false,
  },
  {
    target: 10,
    applePool: 10,
    distractors: [
      { word: 'banana', quantity: 4 },
      { word: 'car', quantity: 4 },
    ],
    autoSubmit: false,
  },
];

const assessmentTargets = [2, 4, 6, 8, 10];

async function upsertCountingQuestion(
  data: CountingQuestionData,
  mathMiniAppId: string,
  countingNodeId: string
): Promise<string> {
  const draggables: IDraggable[] = [
    { id: 'apple', label: 'apple', imageUrl: 'content/math/objects/apple.png', quantity: data.applePool },
    ...data.distractors.map((d) => ({
      id: d.word,
      label: d.word,
      imageUrl: `content/math/objects/${d.word}.png`,
      quantity: d.quantity,
    })),
  ];

  const content: IQuestionContent = {
    avatar: {
      avatarId: 'zoe',
      dialogue: `Count carefully — drag ${data.target} apples into the basket!`,
      emotion: data.target <= 3 ? 'happy' : 'thinking',
    },
    draggables,
    dropZones: [{ id: 'basket', label: 'Basket', requiredDraggableIds: ['apple'], requiredCount: data.target }],
    successFeedback: { text: `Yes! That's ${data.target} apples!` },
    tryAgainFeedback: { text: 'Try again — count carefully!' },
    defaultHelpers: {
      countingAudio: true,
      autoSubmit: data.autoSubmit,
      hintsAllowed: 3,
    },
  };

  const question = await Question.findOneAndUpdate(
    { nodeId: countingNodeId, type: 'dnd_count', 'content.dropZones.0.requiredCount': data.target },
    {
      nodeId: countingNodeId,
      miniAppId: mathMiniAppId,
      type: 'dnd_count',
      maxPoints: 4,
      pointsCanBePartial: false,
      source: 'manual',
      isGeneric: true,
      content,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return question._id.toString();
}

export async function seedCountingQuestions(
  practiceLessonId: string,
  assessmentLessonId: string
): Promise<void> {
  console.log('Seeding Math counting questions...');

  const subject = await Subject.findOne({ slug: 'foundation-phase-mathematics' });
  if (!subject) throw new Error('Foundation Phase Mathematics subject not found — run content seed first');

  const topic = await Topic.findOne({ subjectId: subject._id, slug: 'number-sense' });
  if (!topic) throw new Error('Number Sense topic not found — run content seed first');

  const mathMiniApp = await MiniApp.findOne({ topicId: topic._id, slug: 'roadmap' });
  if (!mathMiniApp) throw new Error('Number Sense roadmap miniApp not found — run content seed first');

  const roadmap = await Roadmap.findOne({ subjectId: subject._id });
  if (!roadmap) throw new Error('Number Sense Roadmap not found — run roadmap seed first');

  const countingNode = await RoadmapNode.findOne({ roadmapId: roadmap._id, title: 'Counting 1 to 10' });
  if (!countingNode) throw new Error('Counting 1 to 10 node not found — run roadmap seed first');

  const mathMiniAppId = mathMiniApp._id.toString();
  const countingNodeId = countingNode._id.toString();

  const questionIdByTarget = new Map<number, string>();
  for (const data of countingData) {
    questionIdByTarget.set(data.target, await upsertCountingQuestion(data, mathMiniAppId, countingNodeId));
  }

  const practiceQuestionIds = countingData.map((d) => questionIdByTarget.get(d.target)!);

  const practiceQuiz = await Quiz.findOneAndUpdate(
    { miniAppId: mathMiniAppId, mode: 'fixed', title: 'Counting 1 to 10 Practice' },
    {
      miniAppId: mathMiniAppId,
      sourceMiniAppIds: [mathMiniAppId],
      title: 'Counting 1 to 10 Practice',
      mode: 'fixed',
      questionIds: practiceQuestionIds,
      settings: { questionCount: practiceQuestionIds.length, questionTypes: [], bucketFilter: 'all' },
      isUserAdjustable: false,
      isDefault: false,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await Lesson.findByIdAndUpdate(practiceLessonId, { quizId: practiceQuiz._id });

  // Assessment samples a subset of the same practice questions (counts 2, 4, 6, 8, 10) rather
  // than fabricating new pools — it's testing the same skill the practice set just taught.
  const assessmentQuestionIds = assessmentTargets.map((t) => questionIdByTarget.get(t)!);

  const assessmentQuiz = await Quiz.findOneAndUpdate(
    { miniAppId: mathMiniAppId, mode: 'fixed', title: 'Counting 1 to 10 Assessment' },
    {
      miniAppId: mathMiniAppId,
      sourceMiniAppIds: [mathMiniAppId],
      title: 'Counting 1 to 10 Assessment',
      mode: 'fixed',
      questionIds: assessmentQuestionIds,
      settings: { questionCount: assessmentQuestionIds.length, questionTypes: [], bucketFilter: 'all' },
      isUserAdjustable: false,
      isDefault: false,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await Lesson.findByIdAndUpdate(assessmentLessonId, { quizId: assessmentQuiz._id });

  console.log(
    `  Seeded ${countingData.length} practice counting questions, ${assessmentQuestionIds.length} sampled for assessment`
  );
}

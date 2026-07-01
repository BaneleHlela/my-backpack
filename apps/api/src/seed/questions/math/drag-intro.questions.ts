// Math "Let's Learn to Drag!" terms + practice/assessment questions. Pure mechanic
// introduction — single zone, single correct item, every question. Objects double as early
// vocabulary exposure (Term/Definition-backed), same as IsiZulu vowels plug into adaptive
// learning. Fully self-contained: creates its own terms/definitions and the questions that use
// them. Idempotent — re-running updates existing records instead of creating duplicates.
import { Types } from 'mongoose';
import Term from '../../../models/apps/language/vocabulary/term.model';
import Definition from '../../../models/apps/language/vocabulary/definition.model';
import Question from '../../../models/apps/language/vocabulary/question.model';
import Subject from '../../../models/core/subject.model';
import Topic from '../../../models/core/topic.model';
import MiniApp from '../../../models/core/miniApp.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
import Quiz from '../../../models/learning/quiz.model';
import { IQuestionContent, IQuestionHelpers } from '../../../modules/question/question.types';

const tryAgainFeedback = { text: 'Try again!' };

interface ObjectData {
  word: string;
  definition: string;
  zoneId: string;
  zoneLabel: string;
  distractorWords: string[]; // other objects (from the same array) to use as distractors
  highlighted: boolean;
}

// ── Practice: the 8 specified objects, helper-fade across the set ────────

const practiceObjects: ObjectData[] = [
  {
    word: 'apple',
    definition: 'A round, juicy fruit that is red or green and good to eat.',
    zoneId: 'basket',
    zoneLabel: 'Basket',
    distractorWords: ['car'],
    highlighted: true,
  },
  {
    word: 'cabbage',
    definition: 'A round vegetable made of many green leaves wrapped together.',
    zoneId: 'basket',
    zoneLabel: 'Basket',
    distractorWords: ['car'],
    highlighted: true,
  },
  {
    word: 'carrot',
    definition: 'A long orange vegetable that grows underground.',
    zoneId: 'basket',
    zoneLabel: 'Basket',
    distractorWords: ['book'],
    highlighted: true,
  },
  {
    word: 'banana',
    definition: 'A long yellow fruit that you peel before you eat it.',
    zoneId: 'basket',
    zoneLabel: 'Basket',
    distractorWords: ['apple'], // same-category distractor (both fruit)
    highlighted: false,
  },
  {
    word: 'ball',
    definition: 'A round toy that you can roll, bounce, or throw.',
    zoneId: 'toy-box',
    zoneLabel: 'Toy Box',
    distractorWords: ['cup'],
    highlighted: false,
  },
  {
    word: 'car',
    definition: 'A vehicle with four wheels that people drive.',
    zoneId: 'garage',
    zoneLabel: 'Garage',
    distractorWords: ['apple', 'ball'],
    highlighted: false,
  },
  {
    word: 'cup',
    definition: 'A small container you drink water or juice from.',
    zoneId: 'shelf',
    zoneLabel: 'Shelf',
    distractorWords: ['carrot', 'book'],
    highlighted: false,
  },
  {
    word: 'book',
    definition: 'Something you open and read, full of words and pictures.',
    zoneId: 'shelf',
    zoneLabel: 'Shelf',
    distractorWords: ['banana', 'car'],
    highlighted: false,
  },
];

// ── Assessment: 5 fresh objects, not used in practice ─────────────────────

const assessmentObjects: ObjectData[] = [
  {
    word: 'dog',
    definition: 'A furry animal that barks and loves to play.',
    zoneId: 'yard',
    zoneLabel: 'Yard',
    distractorWords: ['hat'],
    highlighted: false,
  },
  {
    word: 'hat',
    definition: 'Something you wear on your head.',
    zoneId: 'closet',
    zoneLabel: 'Closet',
    distractorWords: ['spoon'],
    highlighted: false,
  },
  {
    word: 'sock',
    definition: 'Soft clothing you wear on your foot, under your shoe.',
    zoneId: 'drawer',
    zoneLabel: 'Drawer',
    distractorWords: ['bag'],
    highlighted: false,
  },
  {
    word: 'spoon',
    definition: 'A tool with a small bowl on the end, used for eating soup or cereal.',
    zoneId: 'drawer',
    zoneLabel: 'Drawer',
    distractorWords: ['dog'],
    highlighted: false,
  },
  {
    word: 'bag',
    definition: 'Something you use to carry your things.',
    zoneId: 'shelf',
    zoneLabel: 'Shelf',
    distractorWords: ['sock', 'hat'],
    highlighted: false,
  },
];

async function upsertObjectQuestion(
  obj: ObjectData,
  mathMiniAppId: string
): Promise<string> {
  const term = await Term.findOneAndUpdate(
    { miniAppId: mathMiniAppId, word: obj.word },
    {
      word: obj.word,
      miniAppId: mathMiniAppId,
      source: 'manual',
      aiGenerationStatus: 'not_needed',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const definition = await Definition.findOneAndUpdate(
    { termId: term._id, partOfSpeech: 'noun' },
    {
      termId: term._id,
      partOfSpeech: 'noun',
      definition: obj.definition,
      order: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const helpers: Partial<IQuestionHelpers> = {
    highlightCorrectZone: obj.highlighted,
    hintDelaySeconds: obj.highlighted ? 5 : 10,
    autoReadPrompt: true,
    autoSubmit: true,
    showItemLabels: true,
    allowUndo: true,
    hintsAllowed: 3,
  };

  const content: IQuestionContent = {
    avatar: {
      avatarId: 'zoe',
      dialogue: `Let's play! Drag the ${obj.word} into the ${obj.zoneLabel.toLowerCase()}!`,
      emotion: 'excited',
    },
    draggables: [
      { id: `obj-${obj.word}`, label: obj.word, imageUrl: `content/math/objects/${obj.word}.png` },
      ...obj.distractorWords.map((d) => ({
        id: `obj-${d}`,
        label: d,
        imageUrl: `content/math/objects/${d}.png`,
      })),
    ],
    dropZones: [
      {
        id: obj.zoneId,
        label: obj.zoneLabel,
        requiredDraggableIds: [`obj-${obj.word}`],
        requiredCount: 1,
      },
    ],
    successFeedback: { text: `Yes! That's the ${obj.word}!` },
    tryAgainFeedback,
    defaultHelpers: helpers,
  };

  const question = await Question.findOneAndUpdate(
    { termId: term._id, type: 'dnd_single' },
    {
      termId: term._id,
      definitionId: definition._id,
      miniAppId: mathMiniAppId,
      type: 'dnd_single',
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

export async function seedDragIntroQuestions(nodeId: string, introLessonId: string): Promise<void> {
  console.log('Seeding Math drag-intro questions...');

  const subject = await Subject.findOne({ slug: 'foundation-phase-mathematics' });
  if (!subject) throw new Error('Foundation Phase Mathematics subject not found — run content seed first');

  const topic = await Topic.findOne({ subjectId: subject._id, slug: 'number-sense' });
  if (!topic) throw new Error('Number Sense topic not found — run content seed first');

  const mathMiniApp = await MiniApp.findOne({ topicId: topic._id, slug: 'roadmap' });
  if (!mathMiniApp) throw new Error('Number Sense roadmap miniApp not found — run content seed first');

  const mathMiniAppId = mathMiniApp._id.toString();

  const practiceQuestionIds: string[] = [];
  for (const obj of practiceObjects) {
    practiceQuestionIds.push(await upsertObjectQuestion(obj, mathMiniAppId));
  }

  const assessmentQuestionIds: string[] = [];
  for (const obj of assessmentObjects) {
    assessmentQuestionIds.push(await upsertObjectQuestion(obj, mathMiniAppId));
  }

  const practiceQuiz = await Quiz.findOneAndUpdate(
    { miniAppId: mathMiniAppId, mode: 'fixed', title: "Let's Learn to Drag! Practice" },
    {
      miniAppId: mathMiniAppId,
      sourceMiniAppIds: [mathMiniAppId],
      title: "Let's Learn to Drag! Practice",
      mode: 'fixed',
      questionIds: practiceQuestionIds,
      settings: { questionCount: practiceQuestionIds.length, questionTypes: [], bucketFilter: 'all' },
      isUserAdjustable: false,
      isDefault: false,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const assessmentQuiz = await Quiz.findOneAndUpdate(
    { miniAppId: mathMiniAppId, mode: 'fixed', title: "Let's Learn to Drag! Assessment" },
    {
      miniAppId: mathMiniAppId,
      sourceMiniAppIds: [mathMiniAppId],
      title: "Let's Learn to Drag! Assessment",
      mode: 'fixed',
      questionIds: assessmentQuestionIds,
      settings: { questionCount: assessmentQuestionIds.length, questionTypes: [], bucketFilter: 'all' },
      isUserAdjustable: false,
      isDefault: false,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // This file is the sole writer of the drag-intro node's items[] — full overwrite (not
  // $push), safe to re-run. passingScore 0 on the practice item reproduces the old "practice
  // always passes" behavior without a special case in the service layer.
  await RoadmapNode.findByIdAndUpdate(nodeId, {
    items: [
      { itemType: 'lesson', itemId: new Types.ObjectId(introLessonId), position: 1 },
      { itemType: 'quiz', itemId: practiceQuiz._id, position: 2, passingScore: 0 },
      { itemType: 'quiz', itemId: assessmentQuiz._id, position: 3, passingScore: 0.7 },
    ],
  });

  console.log(
    `  Seeded ${practiceObjects.length} practice + ${assessmentObjects.length} assessment drag-intro questions`
  );
}

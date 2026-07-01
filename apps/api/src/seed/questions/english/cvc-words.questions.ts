// English consonant-vowel-consonant (CVC) word terms + practice/assessment questions.
// Three difficulty tiers, ramping by letter-pool composition rather than question type:
//   Tier 1 — only the correct letters, scrambled (pure ordering)
//   Tier 2 — correct letters + 1-2 distractor letters (selection + ordering)
//   Tier 3 — full pool drawn from minimal-pair siblings (e.g. cap/cat/can) — genuine
//            phonemic discrimination, since the words look almost identical on the drag tray
// Each word gets an mcq_audio recognition question (hear it, pick it from similar-sounding
// options) before a dnd_build construction question (hear it, build it letter by letter) —
// recognition before production. Term-backed. Idempotent — re-running updates existing records.
import { Types } from 'mongoose';
import Term from '../../../models/apps/language/vocabulary/term.model';
import Definition from '../../../models/apps/language/vocabulary/definition.model';
import Question from '../../../models/apps/language/vocabulary/question.model';
import Subject from '../../../models/core/subject.model';
import Topic from '../../../models/core/topic.model';
import MiniApp from '../../../models/core/miniApp.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
import Quiz from '../../../models/learning/quiz.model';
import { IBlank, IDraggable, IQuestionContent } from '../../../modules/question/question.types';

interface CvcWordData {
  word: string;
  tier: 1 | 2 | 3;
  definition: string;
  mcqOptions: string[]; // includes the word itself
  distractorLetters: string[]; // extra letters mixed into the dnd_build draggable pool
}

const tryAgainFeedback = { text: 'Try again!' };

const wordData: CvcWordData[] = [
  // Tier 1 — pure ordering, no distractor letters
  { word: 'cat', tier: 1, definition: "A small furry pet that says 'meow'.", mcqOptions: ['cat', 'cot', 'cut'], distractorLetters: [] },
  { word: 'sit', tier: 1, definition: 'To rest your body down on a chair or the floor.', mcqOptions: ['sit', 'set', 'sat'], distractorLetters: [] },
  { word: 'sun', tier: 1, definition: 'The bright star in the sky that gives us light and warmth.', mcqOptions: ['sun', 'sin', 'son'], distractorLetters: [] },

  // Tier 2 — selection + ordering
  { word: 'mat', tier: 2, definition: 'A flat piece of material you wipe your feet on or sit on.', mcqOptions: ['mat', 'met', 'mut'], distractorLetters: ['d', 'o'] },
  { word: 'pin', tier: 2, definition: 'A small, thin piece of metal used to hold things together.', mcqOptions: ['pin', 'pen', 'pan'], distractorLetters: ['s', 'e'] },
  { word: 'dog', tier: 2, definition: 'A furry animal that barks and is a popular pet.', mcqOptions: ['dog', 'dig', 'dug'], distractorLetters: ['c', 'a'] },
  { word: 'cup', tier: 2, definition: 'A small container you drink water or juice from.', mcqOptions: ['cup', 'cap', 'cop'], distractorLetters: ['o', 'b'] },
  { word: 'hen', tier: 2, definition: 'A female chicken that lays eggs.', mcqOptions: ['hen', 'han', 'hun'], distractorLetters: ['s', 't'] },

  // Tier 3 — full pool from minimal-pair siblings (cat/can, pin/pig, hop/hog already used
  // elsewhere as real words/options, not separate Terms — only the representative word per
  // group gets its own Term+Question, keeping each Term+type combination unique)
  { word: 'cap', tier: 3, definition: 'A soft hat with a curved part at the front to shade your eyes.', mcqOptions: ['cap', 'cat', 'can'], distractorLetters: ['t', 'n'] },
  { word: 'pit', tier: 3, definition: 'A deep hole dug in the ground.', mcqOptions: ['pit', 'pin', 'pig'], distractorLetters: ['n', 'g'] },
  { word: 'hot', tier: 3, definition: 'Having a high temperature — the opposite of cold.', mcqOptions: ['hot', 'hop', 'hog'], distractorLetters: ['p', 'g'] },
];

// One word per tier, reused from the practice set rather than fabricated fresh — the assessment
// tests the same skill the practice set just taught.
const assessmentWords = ['sit', 'dog', 'hot'];

async function upsertWordQuestions(
  data: CvcWordData,
  phonicsMiniAppId: string
): Promise<{ mcqId: string; dndId: string }> {
  const term = await Term.findOneAndUpdate(
    { miniAppId: phonicsMiniAppId, word: data.word },
    {
      word: data.word,
      miniAppId: phonicsMiniAppId,
      audioUrl: `sounds/english/cvc/${data.word}.mp3`,
      source: 'manual',
      aiGenerationStatus: 'not_needed',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const definition = await Definition.findOneAndUpdate(
    { termId: term._id, partOfSpeech: 'cvc-word' },
    {
      termId: term._id,
      partOfSpeech: 'cvc-word',
      definition: data.definition,
      order: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const mcqContent: IQuestionContent = {
    prompt: `audio:sounds/english/cvc/${data.word}.mp3`,
    options: data.mcqOptions,
    correctAnswer: data.word,
    explanation: `The word is "${data.word}".`,
    successFeedback: { text: `Yes! That's "${data.word}"!` },
    tryAgainFeedback,
    defaultHelpers: {
      autoReadPrompt: true,
      autoReadOptions: true,
      autoSubmit: true,
      hintsAllowed: 3,
      hintDelaySeconds: 10,
    },
  };

  const mcqQuestion = await Question.findOneAndUpdate(
    { termId: term._id, type: 'mcq_audio' },
    {
      termId: term._id,
      definitionId: definition._id,
      miniAppId: phonicsMiniAppId,
      type: 'mcq_audio',
      maxPoints: 4,
      pointsCanBePartial: false,
      source: 'manual',
      isGeneric: true,
      content: mcqContent,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const letters = data.word.split('');
  const draggables: IDraggable[] = [
    ...letters.map((l) => ({ id: l, label: l })),
    ...data.distractorLetters.map((l) => ({ id: l, label: l })),
  ];
  const blanks: IBlank[] = letters.map((l, i) => ({ position: i, correctDraggableId: l }));

  const dndContent: IQuestionContent = {
    avatar: { avatarId: 'zoe', dialogue: 'Listen, then build the word!', emotion: 'thinking' },
    draggables,
    dropZones: letters.map((l, i) => ({
      id: `pos-${i + 1}`,
      label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : 'rd'} letter`,
      requiredDraggableIds: [l],
      requiredCount: 1,
    })),
    sentenceTemplate: letters.map(() => '___').join(' '),
    blanks,
    successFeedback: { text: `Yes! You built "${data.word}"!` },
    tryAgainFeedback,
    defaultHelpers: { hintsAllowed: 3, hintDelaySeconds: 8 },
  };

  const dndQuestion = await Question.findOneAndUpdate(
    { termId: term._id, type: 'dnd_build' },
    {
      termId: term._id,
      definitionId: definition._id,
      miniAppId: phonicsMiniAppId,
      type: 'dnd_build',
      maxPoints: 5,
      pointsCanBePartial: false,
      source: 'manual',
      isGeneric: true,
      content: dndContent,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { mcqId: mcqQuestion._id.toString(), dndId: dndQuestion._id.toString() };
}

export async function seedCvcWordsQuestions(nodeId: string, introLessonId: string): Promise<void> {
  console.log('Seeding English CVC words questions...');

  const subject = await Subject.findOne({ slug: 'english' });
  if (!subject) throw new Error('English subject not found — run content seed first');

  const topic = await Topic.findOne({ subjectId: subject._id, slug: 'phonics' });
  if (!topic) throw new Error('Phonics topic not found — run content seed first');

  const phonicsMiniApp = await MiniApp.findOne({ topicId: topic._id, slug: 'roadmap' });
  if (!phonicsMiniApp) throw new Error('Phonics roadmap miniApp not found — run content seed first');

  const phonicsMiniAppId = phonicsMiniApp._id.toString();

  const idsByWord = new Map<string, { mcqId: string; dndId: string }>();
  const practiceQuestionIds: string[] = [];
  for (const data of wordData) {
    const ids = await upsertWordQuestions(data, phonicsMiniAppId);
    idsByWord.set(data.word, ids);
    practiceQuestionIds.push(ids.mcqId, ids.dndId);
  }

  const practiceQuiz = await Quiz.findOneAndUpdate(
    { miniAppId: phonicsMiniAppId, mode: 'fixed', title: 'Three-Letter Words Practice' },
    {
      miniAppId: phonicsMiniAppId,
      sourceMiniAppIds: [phonicsMiniAppId],
      title: 'Three-Letter Words Practice',
      mode: 'fixed',
      questionIds: practiceQuestionIds,
      settings: { questionCount: practiceQuestionIds.length, questionTypes: [], bucketFilter: 'all' },
      isUserAdjustable: false,
      isDefault: false,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const assessmentQuestionIds = assessmentWords.flatMap((w) => {
    const ids = idsByWord.get(w)!;
    return [ids.mcqId, ids.dndId];
  });

  const assessmentQuiz = await Quiz.findOneAndUpdate(
    { miniAppId: phonicsMiniAppId, mode: 'fixed', title: 'Three-Letter Words Assessment' },
    {
      miniAppId: phonicsMiniAppId,
      sourceMiniAppIds: [phonicsMiniAppId],
      title: 'Three-Letter Words Assessment',
      mode: 'fixed',
      questionIds: assessmentQuestionIds,
      settings: { questionCount: assessmentQuestionIds.length, questionTypes: [], bucketFilter: 'all' },
      isUserAdjustable: false,
      isDefault: false,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // This file is the sole writer of the CVC node's items[] — full overwrite (not $push),
  // safe to re-run. passingScore 0 on the practice item reproduces the old "practice always
  // passes" behavior without a special case in the service layer.
  await RoadmapNode.findByIdAndUpdate(nodeId, {
    items: [
      { itemType: 'lesson', itemId: new Types.ObjectId(introLessonId), position: 1 },
      { itemType: 'quiz', itemId: practiceQuiz._id, position: 2, passingScore: 0 },
      { itemType: 'quiz', itemId: assessmentQuiz._id, position: 3, passingScore: 0.7 },
    ],
  });

  console.log(
    `  Seeded ${wordData.length} words x 2 question types = ${practiceQuestionIds.length} practice questions, ${assessmentQuestionIds.length} sampled for assessment`
  );
}

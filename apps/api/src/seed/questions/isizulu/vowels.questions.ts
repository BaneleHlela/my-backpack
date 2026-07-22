// IsiZulu vowel terms + practice questions. Edit the vowelData array below to add or change
// vowel content — this is the file you'll touch most often when managing IsiZulu sounds.
//
// Generates the mcq_audio "listening" question per vowel (unchanged, kept for future reuse —
// not currently wired into the node's items[]) plus 6 dnd_single quiz variants that escalate
// distractor count (1 -> 2 -> 5) and toggle audio-on-tap, per
// docs/content/vowels-dnd-quiz-design.md. Each variant quiz has 10 questions (the 5 vowels
// cycled twice). This file is the sole writer of the vowels node's RoadmapNode.items[] — it
// rebuilds the full ordered list (1 lesson item + 6 quiz items) each run.
//
// Fully self-contained: creates its own terms/definitions and the questions that use them.
// Idempotent — re-running updates existing records instead of creating duplicates. dnd_single
// questions are upserted on Question.seedKey rather than {termId, type}, since each vowel now
// has 12 dnd_single questions (6 variants x 2 occurrences), not one.
import { Types } from 'mongoose';
import Term from '../../../models/apps/language/vocabulary/term.model';
import Definition from '../../../models/apps/language/vocabulary/definition.model';
import Question from '../../../models/apps/language/vocabulary/question.model';
import Subject from '../../../models/core/subject.model';
import Course from '../../../models/core/course.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
import Quiz from '../../../models/learning/quiz.model';
import { IDraggable, IQuestionContent } from '../../../modules/question/question.types';

// ── Edit this array to add/change vowel content ──────────

const vowelData = [
  {
    word: 'a',
    phonetic: 'ah',
    audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/a.mp3',
    soundPath: 'sounds/isizulu/vowels/a.mp3',
    definition: "The vowel sound 'a' — as in 'amanzi' (water)",
    examples: ['amanzi', 'amasi', 'abafana'],
    audioQuestionUrl: 'sounds/isizulu/questions/khetha-umsindo-a.mp3',
    successText: 'Kulungile! Umsindo ngu-"a"!',
    successAudioUrl: 'sounds/isizulu/feedback/correct-a.mp3',
  },
  {
    word: 'e',
    phonetic: 'eh',
    audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/e.mp3',
    soundPath: 'sounds/isizulu/vowels/e.mp3',
    definition: "The vowel sound 'e' — as in 'ekhaya' (at home)",
    examples: ['ekhaya', 'emini', 'ezansi'],
    audioQuestionUrl: 'sounds/isizulu/questions/khetha-umsindo-e.mp3',
    successText: 'Kulungile! Umsindo ngu-"e"!',
    successAudioUrl: 'sounds/isizulu/feedback/correct-e.mp3',
  },
  {
    word: 'i',
    phonetic: 'ee',
    audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/i.mp3',
    soundPath: 'sounds/isizulu/vowels/i.mp3',
    definition: "The vowel sound 'i' — as in 'inkosi' (chief)",
    examples: ['inkosi', 'indlela', 'izulu'],
    audioQuestionUrl: 'sounds/isizulu/questions/khetha-umsindo-i.mp3',
    successText: 'Kulungile! Umsindo ngu-"i"!',
    successAudioUrl: 'sounds/isizulu/feedback/correct-i.mp3',
  },
  {
    word: 'o',
    phonetic: 'oh',
    audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/o.mp3',
    soundPath: 'sounds/isizulu/vowels/o.mp3',
    definition: "The vowel sound 'o' — as in 'omama' (mothers)",
    examples: ['omama', 'obaba', 'ogogo'],
    audioQuestionUrl: 'sounds/isizulu/questions/khetha-umsindo-o.mp3',
    successText: 'Kulungile! Umsindo ngu-"o"!',
    successAudioUrl: 'sounds/isizulu/feedback/correct-o.mp3',
  },
  {
    word: 'u',
    phonetic: 'oo',
    audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/u.mp3',
    soundPath: 'sounds/isizulu/vowels/u.mp3',
    definition: "The vowel sound 'u' — as in 'ubuntu' (humanity)",
    examples: ['ubuntu', 'umuntu', 'umuzi'],
    audioQuestionUrl: 'sounds/isizulu/questions/khetha-umsindo-u.mp3',
    successText: 'Kulungile! Umsindo ngu-"u"!',
    successAudioUrl: 'sounds/isizulu/feedback/correct-u.mp3',
  },
];

const tryAgainFeedback = {
  text: 'Zama futhi!',
  audioUrl: 'sounds/isizulu/feedback/try-again.mp3',
};

// ── 6-lesson quiz variant escalation — see docs/content/vowels-dnd-quiz-design.md § 1 ──

interface QuizVariant {
  seedKeyPrefix: string;
  quizTitle: string;
  draggableCount: 1 | 2 | 5;
  audioOn: boolean;
  passingScore: number;
}

const QUIZ_VARIANTS: QuizVariant[] = [
  { seedKeyPrefix: 'vowels-learn-drag-audio', quizTitle: 'Learn to Drag', draggableCount: 1, audioOn: true, passingScore: 1.0 },
  { seedKeyPrefix: 'vowels-learn-drag-solo', quizTitle: 'Learn to Drag — Solo', draggableCount: 1, audioOn: false, passingScore: 1.0 },
  { seedKeyPrefix: 'vowels-pick-sound-audio', quizTitle: 'Pick the Sound', draggableCount: 2, audioOn: true, passingScore: 1.0 },
  { seedKeyPrefix: 'vowels-pick-sound-solo', quizTitle: 'Pick the Sound — Solo', draggableCount: 2, audioOn: false, passingScore: 1.0 },
  { seedKeyPrefix: 'vowels-all-audio', quizTitle: 'All the Vowels', draggableCount: 5, audioOn: true, passingScore: 1.0 },
  { seedKeyPrefix: 'vowels-challenge', quizTitle: 'Vowels Challenge', draggableCount: 5, audioOn: false, passingScore: 1.0 },
];

// Picks `count` vowel-data indices (target first) for a dnd_single question, rotating the
// distractor selection by vowel position and occurrence (1st vs 2nd pass through the 10
// questions) so the pairing/set isn't identical across the quiz.
function pickVowelIndices(targetIndex: number, count: 1 | 2 | 5, occurrence: 1 | 2): number[] {
  if (count >= vowelData.length) return vowelData.map((_, i) => i);
  if (count === 1) return [targetIndex];

  const distractorsNeeded = count - 1;
  const picked: number[] = [];
  for (let step = 1; picked.length < distractorsNeeded; step++) {
    const idx = (targetIndex + step + occurrence) % vowelData.length;
    if (idx !== targetIndex && !picked.includes(idx)) picked.push(idx);
  }
  return [targetIndex, ...picked];
}

// ── Seed function — idempotent ───────────────────────────

export async function seedVowelQuestions(nodeId: string, introLessonId: string): Promise<void> {
  console.log('Seeding IsiZulu vowel questions...');

  // Resolve via the Sounds Course — Term/Question/Quiz.miniAppId is scoped to the Course's
  // _id for roadmap-linked content (no MiniApp represents roadmaps anymore).
  const subject = await Subject.findOne({ slug: 'isizulu-hl' });
  if (!subject) throw new Error('IsiZulu HL subject not found — run content seed first');

  const soundsCourse = await Course.findOne({ subjectId: subject._id, slug: 'sounds' });
  if (!soundsCourse) throw new Error('Sounds course not found — run the roadmap seeder first');

  // Superseded by the 6 quiz-variant dnd_single questions below (not extended) — the old
  // single dnd_single-per-vowel question (no seedKey, one per Term) and its Quiz are deleted
  // rather than left orphaned, matching the seed system's idempotent-upsert philosophy.
  await Question.deleteMany({
    miniAppId: soundsCourse._id,
    type: 'dnd_single',
    seedKey: { $exists: false },
  });
  await Quiz.deleteMany({ miniAppId: soundsCourse._id, title: 'IsiZulu Vowels Practice' });

  const allOptions = vowelData.map((v) => v.word);

  // Terms/definitions/mcq_audio questions — unchanged from before, one per vowel.
  const termsByWord = new Map<string, { termId: string; definitionId: string }>();

  for (const v of vowelData) {
    // Term.word is unique per miniAppId, not globally — English Phonics also seeds 'a'-'u'
    // Terms against its own miniApp, so the query must be scoped here too.
    const term = await Term.findOneAndUpdate(
      { miniAppId: soundsCourse._id, word: v.word },
      {
        word: v.word,
        miniAppId: soundsCourse._id,
        phonetic: v.phonetic,
        audioUrl: v.audioUrl,
        source: 'manual',
        aiGenerationStatus: 'not_needed',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const definition = await Definition.findOneAndUpdate(
      { termId: term._id, partOfSpeech: 'vowel' },
      {
        termId: term._id,
        partOfSpeech: 'vowel',
        definition: v.definition,
        examples: v.examples,
        order: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    termsByWord.set(v.word, { termId: term._id.toString(), definitionId: definition._id.toString() });

    const audioContent: IQuestionContent = {
      prompt: `audio:${v.audioQuestionUrl}`,
      options: allOptions,
      correctAnswer: v.word,
      explanation: `Umsindo ofanele ngu-"${v.word}"`,
      successFeedback: {
        text: v.successText,
        audioUrl: v.successAudioUrl,
      },
      tryAgainFeedback,
      defaultHelpers: {
        autoReadPrompt: true,
        autoReadOptions: true,
        autoSubmit: true,
        hintsAllowed: 3,
        hintDelaySeconds: 10,
      },
    };

    await Question.findOneAndUpdate(
      { termId: term._id, type: 'mcq_audio' },
      {
        termId: term._id,
        definitionId: definition._id,
        miniAppId: soundsCourse._id,
        type: 'mcq_audio',
        maxPoints: 4,
        pointsCanBePartial: false,
        source: 'manual',
        isGeneric: true,
        content: audioContent,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // dnd_single questions — 6 variants x 10 questions (5 vowels cycled twice) each.
  let totalDndQuestions = 0;
  const quizIds: string[] = [];

  for (let variantIndex = 0; variantIndex < QUIZ_VARIANTS.length; variantIndex++) {
    const variant = QUIZ_VARIANTS[variantIndex];
    const cycled = [...vowelData, ...vowelData];
    const questionIds: string[] = [];

    for (let i = 0; i < cycled.length; i++) {
      const v = cycled[i];
      const vowelIndex = i % vowelData.length;
      const occurrence: 1 | 2 = i < vowelData.length ? 1 : 2;
      const seedKey = `isizulu-${variant.seedKeyPrefix}-${v.word}-${occurrence}`;

      const { termId, definitionId } = termsByWord.get(v.word)!;
      const pickedIndices = pickVowelIndices(vowelIndex, variant.draggableCount, occurrence);
      const draggables: IDraggable[] = pickedIndices.map((idx) => {
        const dv = vowelData[idx];
        const draggable: IDraggable = {
          id: `vowel-${dv.word}`,
          label: dv.word,
          imageUrl: `content/isizulu/vowels/card-${dv.word}.png`,
        };
        if (variant.audioOn) draggable.audioUrl = dv.soundPath;
        return draggable;
      });

      const dndContent: IQuestionContent = {
        avatar: {
          avatarId: 'zoe',
          dialogue: `Hamba ushaye i-"${v.word}"!`,
          dialogueAudioUrl: `sounds/isizulu/avatar/zoe-drag-${v.word}.mp3`,
          emotion: 'excited',
        },
        draggables,
        dropZones: [{ id: 'zone-main', requiredDraggableIds: [`vowel-${v.word}`], requiredCount: 1 }],
        successFeedback: {
          text: v.successText,
          audioUrl: v.successAudioUrl,
          highlightWords: v.successText.split(' '),
        },
        tryAgainFeedback,
        defaultHelpers: {
          autoSubmit: true,
          allowUndo: true,
          hintsAllowed: 3,
          hintDelaySeconds: 10,
          showItemLabels: true,
          retryUntilCorrect: true,
        },
      };

      const dndQuestion = await Question.findOneAndUpdate(
        { seedKey },
        {
          seedKey,
          termId,
          definitionId,
          miniAppId: soundsCourse._id,
          type: 'dnd_single',
          maxPoints: 4,
          pointsCanBePartial: false,
          source: 'manual',
          isGeneric: true,
          content: dndContent,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      questionIds.push(dndQuestion._id.toString());
    }

    const quizTitle = `IsiZulu Vowels — ${variant.quizTitle}`;
    const quiz = await Quiz.findOneAndUpdate(
      { miniAppId: soundsCourse._id, mode: 'fixed', title: quizTitle },
      {
        miniAppId: soundsCourse._id,
        sourceMiniAppIds: [soundsCourse._id],
        title: quizTitle,
        mode: 'fixed',
        questionIds,
        settings: {
          questionCount: questionIds.length,
          questionTypes: [],
          bucketFilter: 'all',
        },
        isUserAdjustable: false,
        isDefault: false,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    quizIds.push(quiz._id.toString());
    totalDndQuestions += questionIds.length;
  }

  // This file is the sole writer of the vowels node's items[] — full overwrite (not $push),
  // safe to re-run.
  await RoadmapNode.findByIdAndUpdate(nodeId, {
    items: [
      { itemType: 'lesson', itemId: new Types.ObjectId(introLessonId), position: 1 },
      ...quizIds.map((id, i) => ({
        itemType: 'quiz' as const,
        itemId: new Types.ObjectId(id),
        position: i + 2,
        passingScore: QUIZ_VARIANTS[i].passingScore,
      })),
    ],
  });

  console.log(
    `  Seeded ${vowelData.length} vowels (mcq_audio) + ${QUIZ_VARIANTS.length} quiz variants x 10 dnd_single = ${totalDndQuestions} questions`
  );
}

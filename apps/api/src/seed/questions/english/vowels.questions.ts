// English vowel-letter terms + practice questions. Mirrors isizulu/vowels.questions.ts
// structurally — same dual question pattern (mcq_audio + 6 dnd_single quiz variants), same
// avatar (zoe), same successFeedback/tryAgainFeedback/defaultHelpers shape, per
// docs/content/vowels-dnd-quiz-design.md. This build teaches letter NAMES (A, E, I, O, U),
// not vowel sounds — that's a separate, later topic. This file is the sole writer of the
// vowels node's RoadmapNode.items[] — it rebuilds the full ordered list (1 lesson item + 6
// quiz items) each run.
//
// Term.word is unique per miniAppId (not globally), so this creates its own 'a'-'u' Terms
// scoped to the English Phonics miniApp rather than colliding with IsiZulu's vowel Terms.
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
import Topic from '../../../models/core/topic.model';
import MiniApp from '../../../models/core/miniApp.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
import Quiz from '../../../models/learning/quiz.model';
import { IDraggable, IQuestionContent } from '../../../modules/question/question.types';

// ── Edit this array to add/change vowel-letter content ──────────

const vowelData = [
  {
    word: 'a',
    letter: 'A',
    phonetic: 'ay',
    audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/english/vowels/a.mp3',
    soundPath: 'sounds/english/vowels/a.mp3',
    definition: "The letter 'A' — as in 'Apple'",
    examples: ['Apple', 'Ant', 'Alligator'],
    audioQuestionUrl: 'sounds/english/questions/pick-letter-a.mp3',
    successText: 'Great job! That\'s the letter A!',
    successAudioUrl: 'sounds/english/feedback/correct-a.mp3',
  },
  {
    word: 'e',
    letter: 'E',
    phonetic: 'ee',
    audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/english/vowels/e.mp3',
    soundPath: 'sounds/english/vowels/e.mp3',
    definition: "The letter 'E' — as in 'Elephant'",
    examples: ['Elephant', 'Egg', 'Envelope'],
    audioQuestionUrl: 'sounds/english/questions/pick-letter-e.mp3',
    successText: 'Great job! That\'s the letter E!',
    successAudioUrl: 'sounds/english/feedback/correct-e.mp3',
  },
  {
    word: 'i',
    letter: 'I',
    phonetic: 'eye',
    audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/english/vowels/i.mp3',
    soundPath: 'sounds/english/vowels/i.mp3',
    definition: "The letter 'I' — as in 'Igloo'",
    examples: ['Igloo', 'Insect', 'Ice cream'],
    audioQuestionUrl: 'sounds/english/questions/pick-letter-i.mp3',
    successText: 'Great job! That\'s the letter I!',
    successAudioUrl: 'sounds/english/feedback/correct-i.mp3',
  },
  {
    word: 'o',
    letter: 'O',
    phonetic: 'oh',
    audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/english/vowels/o.mp3',
    soundPath: 'sounds/english/vowels/o.mp3',
    definition: "The letter 'O' — as in 'Octopus'",
    examples: ['Octopus', 'Orange', 'Ostrich'],
    audioQuestionUrl: 'sounds/english/questions/pick-letter-o.mp3',
    successText: 'Great job! That\'s the letter O!',
    successAudioUrl: 'sounds/english/feedback/correct-o.mp3',
  },
  {
    word: 'u',
    letter: 'U',
    phonetic: 'you',
    audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/english/vowels/u.mp3',
    soundPath: 'sounds/english/vowels/u.mp3',
    definition: "The letter 'U' — as in 'Umbrella'",
    examples: ['Umbrella', 'Unicorn', 'Up'],
    audioQuestionUrl: 'sounds/english/questions/pick-letter-u.mp3',
    successText: 'Great job! That\'s the letter U!',
    successAudioUrl: 'sounds/english/feedback/correct-u.mp3',
  },
];

const tryAgainFeedback = {
  text: 'Try again!',
  audioUrl: 'sounds/english/feedback/try-again.mp3',
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

export async function seedEnglishVowelQuestions(nodeId: string, introLessonId: string): Promise<void> {
  console.log('Seeding English vowel questions...');

  // Resolve via the content hierarchy rather than MiniApp.findOne({ slug: 'roadmap' }) alone —
  // 'roadmap' is not globally unique, other subjects (e.g. isiZulu, math) also have a 'roadmap' miniApp.
  const subject = await Subject.findOne({ slug: 'english' });
  if (!subject) throw new Error('English subject not found — run content seed first');

  const topic = await Topic.findOne({ subjectId: subject._id, slug: 'phonics' });
  if (!topic) throw new Error('Phonics topic not found — run content seed first');

  const phonicsMiniApp = await MiniApp.findOne({ topicId: topic._id, slug: 'roadmap' });
  if (!phonicsMiniApp) throw new Error('Phonics roadmap miniApp not found — run content seed first');

  // Superseded by the 6 quiz-variant dnd_single questions below (not extended) — the old
  // single dnd_single-per-vowel question (no seedKey, one per Term) and its Quiz are deleted
  // rather than left orphaned, matching the seed system's idempotent-upsert philosophy.
  await Question.deleteMany({
    miniAppId: phonicsMiniApp._id,
    type: 'dnd_single',
    seedKey: { $exists: false },
  });
  await Quiz.deleteMany({ miniAppId: phonicsMiniApp._id, title: 'English Vowels Practice' });

  const allOptions = vowelData.map((v) => v.word);

  // Terms/definitions/mcq_audio questions — unchanged from before, one per vowel.
  const termsByWord = new Map<string, { termId: string; definitionId: string }>();

  for (const v of vowelData) {
    const term = await Term.findOneAndUpdate(
      { miniAppId: phonicsMiniApp._id, word: v.word },
      {
        word: v.word,
        miniAppId: phonicsMiniApp._id,
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
      explanation: `The letter is "${v.letter}" — like in ${v.examples[0]}!`,
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
        miniAppId: phonicsMiniApp._id,
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
      const seedKey = `english-${variant.seedKeyPrefix}-${v.word}-${occurrence}`;

      const { termId, definitionId } = termsByWord.get(v.word)!;
      const pickedIndices = pickVowelIndices(vowelIndex, variant.draggableCount, occurrence);
      const draggables: IDraggable[] = pickedIndices.map((idx) => {
        const dv = vowelData[idx];
        const draggable: IDraggable = {
          id: `vowel-${dv.word}`,
          label: dv.letter,
          imageUrl: `content/english/vowels/card-${dv.word}.png`,
        };
        if (variant.audioOn) draggable.audioUrl = dv.soundPath;
        return draggable;
      });

      const dndContent: IQuestionContent = {
        avatar: {
          avatarId: 'zoe',
          dialogue: `Drag the letter ${v.letter}!`,
          dialogueAudioUrl: `sounds/english/avatar/zoe-drag-${v.word}.mp3`,
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
          miniAppId: phonicsMiniApp._id,
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

    const quizTitle = `English Vowels — ${variant.quizTitle}`;
    const quiz = await Quiz.findOneAndUpdate(
      { miniAppId: phonicsMiniApp._id, mode: 'fixed', title: quizTitle },
      {
        miniAppId: phonicsMiniApp._id,
        sourceMiniAppIds: [phonicsMiniApp._id],
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

// English vowel terms + practice questions. Mirrors isizulu/vowels.questions.ts structurally —
// same dual question pattern (mcq_audio + dnd_single per vowel), same avatar (zoe), same
// successFeedback/tryAgainFeedback/defaultHelpers shape. Fully self-contained: creates its own
// terms/definitions and the questions that use them. Idempotent — re-running updates existing
// records instead of creating duplicates.
//
// Term.word is unique per miniAppId (not globally), so this creates its own 'a'-'u' Terms
// scoped to the English Phonics miniApp rather than colliding with IsiZulu's vowel Terms.
import Term from '../../../models/apps/language/vocabulary/term.model';
import Definition from '../../../models/apps/language/vocabulary/definition.model';
import Question from '../../../models/apps/language/vocabulary/question.model';
import Subject from '../../../models/core/subject.model';
import Topic from '../../../models/core/topic.model';
import MiniApp from '../../../models/core/miniApp.model';
import Lesson from '../../../models/learning/lesson.model';
import Quiz from '../../../models/learning/quiz.model';
import { IQuestionContent } from '../../../modules/question/question.types';

// ── Edit this array to add/change vowel content ──────────

const vowelData = [
  {
    word: 'a',
    phonetic: '/æ/',
    audioUrl: 'sounds/english/vowels/a.mp3',
    definition: "The short vowel sound 'a' — as in 'apple'",
    examples: ['apple', 'cat'],
    audioQuestionUrl: 'sounds/english/questions/pick-sound-a.mp3',
    successText: 'Yes! The short vowel sound is "a"!',
  },
  {
    word: 'e',
    phonetic: '/ɛ/',
    audioUrl: 'sounds/english/vowels/e.mp3',
    definition: "The short vowel sound 'e' — as in 'egg'",
    examples: ['egg', 'bed'],
    audioQuestionUrl: 'sounds/english/questions/pick-sound-e.mp3',
    successText: 'Yes! The short vowel sound is "e"!',
  },
  {
    word: 'i',
    phonetic: '/ɪ/',
    audioUrl: 'sounds/english/vowels/i.mp3',
    definition: "The short vowel sound 'i' — as in 'igloo'",
    examples: ['igloo', 'sit'],
    audioQuestionUrl: 'sounds/english/questions/pick-sound-i.mp3',
    successText: 'Yes! The short vowel sound is "i"!',
  },
  {
    word: 'o',
    phonetic: '/ɒ/',
    audioUrl: 'sounds/english/vowels/o.mp3',
    definition: "The short vowel sound 'o' — as in 'octopus'",
    examples: ['octopus', 'dog'],
    audioQuestionUrl: 'sounds/english/questions/pick-sound-o.mp3',
    successText: 'Yes! The short vowel sound is "o"!',
  },
  {
    word: 'u',
    phonetic: '/ʌ/',
    audioUrl: 'sounds/english/vowels/u.mp3',
    definition: "The short vowel sound 'u' — as in 'umbrella'",
    examples: ['umbrella', 'cup'],
    audioQuestionUrl: 'sounds/english/questions/pick-sound-u.mp3',
    successText: 'Yes! The short vowel sound is "u"!',
  },
];

const tryAgainFeedback = { text: 'Try again!' };

// ── Seed function — idempotent ───────────────────────────

export async function seedEnglishVowelQuestions(practiceLessonId: string): Promise<void> {
  console.log('Seeding English vowel questions...');

  // Resolve via the content hierarchy rather than MiniApp.findOne({ slug: 'roadmap' }) alone —
  // 'roadmap' is not globally unique, other subjects (e.g. isiZulu, math) also have a 'roadmap' miniApp.
  const subject = await Subject.findOne({ slug: 'english' });
  if (!subject) throw new Error('English subject not found — run content seed first');

  const topic = await Topic.findOne({ subjectId: subject._id, slug: 'phonics' });
  if (!topic) throw new Error('Phonics topic not found — run content seed first');

  const phonicsMiniApp = await MiniApp.findOne({ topicId: topic._id, slug: 'roadmap' });
  if (!phonicsMiniApp) throw new Error('Phonics roadmap miniApp not found — run content seed first');

  const allOptions = vowelData.map((v) => v.word);
  const createdQuestionIds: string[] = [];

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

    const audioContent: IQuestionContent = {
      prompt: `audio:${v.audioQuestionUrl}`,
      options: allOptions,
      correctAnswer: v.word,
      explanation: `The short vowel sound is "${v.word}" — like in ${v.examples[0]}!`,
      successFeedback: { text: v.successText },
      tryAgainFeedback,
      defaultHelpers: {
        autoReadPrompt: true,
        autoReadOptions: true,
        autoSubmit: true,
        hintsAllowed: 3,
        hintDelaySeconds: 10,
      },
    };

    const audioQuestion = await Question.findOneAndUpdate(
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
    createdQuestionIds.push(audioQuestion._id.toString());

    const otherVowels = vowelData.filter((o) => o.word !== v.word).slice(0, 2);
    const dndContent: IQuestionContent = {
      avatar: {
        avatarId: 'zoe',
        dialogue: 'Drag the letter you heard!',
        emotion: 'excited',
      },
      draggables: [
        {
          id: `vowel-${v.word}`,
          label: v.word,
          imageUrl: `content/english/vowels/card-${v.word}.png`,
          audioUrl: v.audioUrl,
        },
        ...otherVowels.map((o) => ({
          id: `vowel-${o.word}`,
          label: o.word,
          imageUrl: `content/english/vowels/card-${o.word}.png`,
          audioUrl: o.audioUrl,
        })),
      ],
      dropZones: [{ id: 'zone-main', requiredDraggableIds: [`vowel-${v.word}`], requiredCount: 1 }],
      successFeedback: { text: v.successText, highlightWords: v.successText.split(' ') },
      tryAgainFeedback,
      defaultHelpers: {
        autoReadPrompt: true,
        autoReadOptions: true,
        autoSubmit: true,
        showItemLabels: true,
        allowUndo: true,
        hintsAllowed: 3,
        hintDelaySeconds: 10,
        highlightCorrectZone: false,
        animateHint: false,
      },
    };

    const dndQuestion = await Question.findOneAndUpdate(
      { termId: term._id, type: 'dnd_single' },
      {
        termId: term._id,
        definitionId: definition._id,
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
    createdQuestionIds.push(dndQuestion._id.toString());
  }

  const practiceQuiz = await Quiz.findOneAndUpdate(
    { miniAppId: phonicsMiniApp._id, mode: 'fixed', title: 'English Vowels Practice' },
    {
      miniAppId: phonicsMiniApp._id,
      sourceMiniAppIds: [phonicsMiniApp._id],
      title: 'English Vowels Practice',
      mode: 'fixed',
      questionIds: createdQuestionIds,
      settings: { questionCount: createdQuestionIds.length, questionTypes: [], bucketFilter: 'all' },
      isUserAdjustable: false,
      isDefault: false,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await Lesson.findByIdAndUpdate(practiceLessonId, { quizId: practiceQuiz._id });

  console.log(
    `  Seeded ${vowelData.length} vowels x 2 question types = ${createdQuestionIds.length} questions`
  );
}

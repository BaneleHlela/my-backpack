// IsiZulu consonant terms + practice/assessment questions. Same pattern as
// isizulu/vowels.questions.ts — each consonant is drilled against all 5 vowel sounds before
// moving to the next consonant, the way isiZulu literacy is actually taught. Term.word = the
// syllable (e.g. 'ba'). Fully self-contained: creates its own terms/definitions and the
// questions that use them. Idempotent — re-running updates existing records.
//
// isiZulu has no /r/ phoneme as a native consonant — never generate ra/re/ri/ro/ru syllables.
// excludeVowels is a per-consonant guard for this; empty for b/c since both pair with all 5
// vowels, but it stays here as a real check (not just a comment) for future consonants.
import Term from '../../../models/apps/language/vocabulary/term.model';
import Definition from '../../../models/apps/language/vocabulary/definition.model';
import Question from '../../../models/apps/language/vocabulary/question.model';
import Subject from '../../../models/core/subject.model';
import Topic from '../../../models/core/topic.model';
import MiniApp from '../../../models/core/miniApp.model';
import Lesson from '../../../models/learning/lesson.model';
import Quiz from '../../../models/learning/quiz.model';
import { IBlank, IDraggable, IQuestionContent } from '../../../modules/question/question.types';

const VOWELS = ['a', 'e', 'i', 'o', 'u'];

interface ConsonantData {
  letter: string;
  excludeVowels: string[];
}

// Starter consonants — more (m, n, l, and eventually the clicks q, x) become their own
// follow-on nodes using this same template.
const consonantData: ConsonantData[] = [
  { letter: 'b', excludeVowels: [] },
  { letter: 'c', excludeVowels: [] },
];

const tryAgainFeedback = {
  text: 'Zama futhi!',
  audioUrl: 'sounds/isizulu/feedback/try-again.mp3',
};

const assessmentSyllables = ['ba', 'bo', 'ca', 'cu', 'be'];

function distractorsFor(consonant: string, vowel: string): { consonant: string; vowel: string } {
  const otherConsonant = consonantData.find((c) => c.letter !== consonant)!.letter;
  const vowelIndex = VOWELS.indexOf(vowel);
  const otherVowel = VOWELS[(vowelIndex + 1) % VOWELS.length];
  return { consonant: otherConsonant, vowel: otherVowel };
}

async function upsertSyllableQuestions(
  consonant: string,
  vowel: string,
  allSyllables: string[],
  soundsMiniAppId: string
): Promise<{ mcqId: string; dndId: string }> {
  const syllable = `${consonant}${vowel}`;

  const term = await Term.findOneAndUpdate(
    { miniAppId: soundsMiniAppId, word: syllable },
    {
      word: syllable,
      miniAppId: soundsMiniAppId,
      audioUrl: `sounds/isizulu/consonants/${syllable}.mp3`,
      source: 'manual',
      aiGenerationStatus: 'not_needed',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const definition = await Definition.findOneAndUpdate(
    { termId: term._id, partOfSpeech: 'syllable' },
    {
      termId: term._id,
      partOfSpeech: 'syllable',
      definition: `Isigaba "${syllable}" — ungwaqa "${consonant}" kanye nonkamisa "${vowel}"`,
      order: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const mcqContent: IQuestionContent = {
    prompt: `audio:sounds/isizulu/consonants/${syllable}.mp3`,
    options: allSyllables,
    correctAnswer: syllable,
    explanation: `Umsindo ofanele ngu-"${syllable}"`,
    successFeedback: { text: `Kulungile! Isigaba ngu-"${syllable}"!` },
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
      miniAppId: soundsMiniAppId,
      type: 'mcq_audio',
      maxPoints: 4,
      pointsCanBePartial: false,
      source: 'manual',
      isGeneric: true,
      content: mcqContent,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const distractors = distractorsFor(consonant, vowel);
  const draggables: IDraggable[] = [
    { id: consonant, label: consonant },
    { id: vowel, label: vowel },
    { id: `${distractors.consonant}-d`, label: distractors.consonant },
    { id: `${distractors.vowel}-d`, label: distractors.vowel },
  ];
  const blanks: IBlank[] = [
    { position: 0, correctDraggableId: consonant },
    { position: 1, correctDraggableId: vowel },
  ];

  const dndContent: IQuestionContent = {
    avatar: { avatarId: 'zoe', dialogue: `Yakha isigaba owuzwile: "${syllable}"!`, emotion: 'excited' },
    draggables,
    dropZones: [
      { id: 'pos-1', label: '1st letter', requiredDraggableIds: [consonant], requiredCount: 1 },
      { id: 'pos-2', label: '2nd letter', requiredDraggableIds: [vowel], requiredCount: 1 },
    ],
    sentenceTemplate: '___ ___',
    blanks,
    successFeedback: { text: `Kulungile! Isigaba ngu-"${syllable}"!` },
    tryAgainFeedback,
    defaultHelpers: { hintsAllowed: 3, hintDelaySeconds: 8 },
  };

  const dndQuestion = await Question.findOneAndUpdate(
    { termId: term._id, type: 'dnd_build' },
    {
      termId: term._id,
      definitionId: definition._id,
      miniAppId: soundsMiniAppId,
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

export async function seedConsonantQuestions(
  practiceLessonId: string,
  assessmentLessonId: string
): Promise<void> {
  console.log('Seeding IsiZulu consonant questions...');

  const subject = await Subject.findOne({ slug: 'isizulu-hl' });
  if (!subject) throw new Error('IsiZulu HL subject not found — run content seed first');

  const topic = await Topic.findOne({ subjectId: subject._id, slug: 'sounds' });
  if (!topic) throw new Error('Sounds topic not found — run content seed first');

  const soundsMiniApp = await MiniApp.findOne({ topicId: topic._id, slug: 'roadmap' });
  if (!soundsMiniApp) throw new Error('Sounds roadmap miniApp not found — run content seed first');

  const soundsMiniAppId = soundsMiniApp._id.toString();

  const idsBySyllable = new Map<string, { mcqId: string; dndId: string }>();
  const practiceQuestionIds: string[] = [];

  for (const c of consonantData) {
    const vowelsForConsonant = VOWELS.filter((v) => !c.excludeVowels.includes(v));
    const syllablesForConsonant = vowelsForConsonant.map((v) => `${c.letter}${v}`);

    for (const v of vowelsForConsonant) {
      const ids = await upsertSyllableQuestions(c.letter, v, syllablesForConsonant, soundsMiniAppId);
      idsBySyllable.set(`${c.letter}${v}`, ids);
      practiceQuestionIds.push(ids.mcqId, ids.dndId);
    }
  }

  const practiceQuiz = await Quiz.findOneAndUpdate(
    { miniAppId: soundsMiniAppId, mode: 'fixed', title: 'IsiZulu Consonants Practice' },
    {
      miniAppId: soundsMiniAppId,
      sourceMiniAppIds: [soundsMiniAppId],
      title: 'IsiZulu Consonants Practice',
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

  const assessmentQuestionIds = assessmentSyllables.flatMap((s) => {
    const ids = idsBySyllable.get(s)!;
    return [ids.mcqId, ids.dndId];
  });

  const assessmentQuiz = await Quiz.findOneAndUpdate(
    { miniAppId: soundsMiniAppId, mode: 'fixed', title: 'IsiZulu Consonants Assessment' },
    {
      miniAppId: soundsMiniAppId,
      sourceMiniAppIds: [soundsMiniAppId],
      title: 'IsiZulu Consonants Assessment',
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
    `  Seeded ${consonantData.length} consonants x ${VOWELS.length} vowels x 2 question types = ${practiceQuestionIds.length} practice questions, ${assessmentQuestionIds.length} sampled for assessment`
  );
}

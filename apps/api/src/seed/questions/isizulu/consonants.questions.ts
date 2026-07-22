// IsiZulu consonant terms + practice/assessment questions. Same pattern as
// isizulu/vowels.questions.ts — each consonant is drilled against all 5 vowel sounds before
// moving to the next consonant, the way isiZulu literacy is actually taught. Term.word = the
// syllable (e.g. 'ba'). Fully self-contained: creates its own terms/definitions and the
// questions that use them. Idempotent — re-running updates existing records.
//
// isiZulu has no /r/ phoneme as a native consonant — never generate ra/re/ri/ro/ru syllables.
// excludeVowels is a per-consonant guard for this; empty for b/c since both pair with all 5
// vowels, but it stays here as a real check (not just a comment) for future consonants.
import { Types } from 'mongoose';
import Term from '../../../models/apps/language/vocabulary/term.model';
import Definition from '../../../models/apps/language/vocabulary/definition.model';
import Question from '../../../models/apps/language/vocabulary/question.model';
import Subject from '../../../models/core/subject.model';
import Course from '../../../models/core/course.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
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
  soundsCourseId: string
): Promise<{ mcqId: string; dndId: string }> {
  const syllable = `${consonant}${vowel}`;

  const term = await Term.findOneAndUpdate(
    { miniAppId: soundsCourseId, word: syllable },
    {
      word: syllable,
      miniAppId: soundsCourseId,
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
      miniAppId: soundsCourseId,
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
      miniAppId: soundsCourseId,
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

export async function seedConsonantQuestions(nodeId: string, introLessonId: string): Promise<void> {
  console.log('Seeding IsiZulu consonant questions...');

  const subject = await Subject.findOne({ slug: 'isizulu-hl' });
  if (!subject) throw new Error('IsiZulu HL subject not found — run content seed first');

  // Term/Question/Quiz.miniAppId is scoped to the Sounds Course's _id for roadmap-linked
  // content (no MiniApp represents roadmaps anymore).
  const soundsCourse = await Course.findOne({ subjectId: subject._id, slug: 'sounds' });
  if (!soundsCourse) throw new Error('Sounds course not found — run the roadmap seeder first');

  const soundsCourseId = soundsCourse._id.toString();

  const idsBySyllable = new Map<string, { mcqId: string; dndId: string }>();
  const practiceQuestionIds: string[] = [];

  for (const c of consonantData) {
    const vowelsForConsonant = VOWELS.filter((v) => !c.excludeVowels.includes(v));
    const syllablesForConsonant = vowelsForConsonant.map((v) => `${c.letter}${v}`);

    for (const v of vowelsForConsonant) {
      const ids = await upsertSyllableQuestions(c.letter, v, syllablesForConsonant, soundsCourseId);
      idsBySyllable.set(`${c.letter}${v}`, ids);
      practiceQuestionIds.push(ids.mcqId, ids.dndId);
    }
  }

  const practiceQuiz = await Quiz.findOneAndUpdate(
    { miniAppId: soundsCourseId, mode: 'fixed', title: 'IsiZulu Consonants Practice' },
    {
      miniAppId: soundsCourseId,
      sourceMiniAppIds: [soundsCourseId],
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

  const assessmentQuestionIds = assessmentSyllables.flatMap((s) => {
    const ids = idsBySyllable.get(s)!;
    return [ids.mcqId, ids.dndId];
  });

  const assessmentQuiz = await Quiz.findOneAndUpdate(
    { miniAppId: soundsCourseId, mode: 'fixed', title: 'IsiZulu Consonants Assessment' },
    {
      miniAppId: soundsCourseId,
      sourceMiniAppIds: [soundsCourseId],
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

  // This file is the sole writer of the consonants node's items[] — full overwrite (not
  // $push), safe to re-run. passingScore 0 on the practice item reproduces the old
  // "practice always passes" behavior without a special case in the service layer.
  await RoadmapNode.findByIdAndUpdate(nodeId, {
    items: [
      { itemType: 'lesson', itemId: new Types.ObjectId(introLessonId), position: 1 },
      { itemType: 'quiz', itemId: practiceQuiz._id, position: 2, passingScore: 0 },
      { itemType: 'quiz', itemId: assessmentQuiz._id, position: 3, passingScore: 0.7 },
    ],
  });

  console.log(
    `  Seeded ${consonantData.length} consonants x ${VOWELS.length} vowels x 2 question types = ${practiceQuestionIds.length} practice questions, ${assessmentQuestionIds.length} sampled for assessment`
  );
}

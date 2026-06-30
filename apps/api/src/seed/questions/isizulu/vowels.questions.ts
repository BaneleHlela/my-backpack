// IsiZulu vowel terms + practice questions. Edit the vowelData array below to add or change
// vowel content — this is the file you'll touch most often when managing IsiZulu sounds.
// Fully self-contained: creates its own terms/definitions and the questions that use them.
// Idempotent — re-running updates existing records instead of creating duplicates.
import Term from '../../../models/apps/language/vocabulary/term.model';
import Definition from '../../../models/apps/language/vocabulary/definition.model';
import Question from '../../../models/apps/language/vocabulary/question.model';
import Subject from '../../../models/core/subject.model';
import Topic from '../../../models/core/topic.model';
import MiniApp from '../../../models/core/miniApp.model';
import Lesson from '../../../models/learning/lesson.model';
import { IQuestionContent } from '../../../modules/question/question.types';

// ── Edit this array to add/change vowel content ──────────

const vowelData = [
  {
    word: 'a',
    phonetic: 'ah',
    audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/a.mp3',
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

// ── Seed function — idempotent ───────────────────────────

export async function seedVowelQuestions(practiceLessonId: string): Promise<void> {
  console.log('Seeding IsiZulu vowel questions...');

  // Resolve via the content hierarchy rather than MiniApp.findOne({ slug: 'roadmap' }) alone —
  // 'roadmap' is not globally unique, other subjects (e.g. math) also have a 'roadmap' miniApp.
  const subject = await Subject.findOne({ slug: 'isizulu-hl' });
  if (!subject) throw new Error('IsiZulu HL subject not found — run content seed first');

  const topic = await Topic.findOne({ subjectId: subject._id, slug: 'sounds' });
  if (!topic) throw new Error('Sounds topic not found — run content seed first');

  const soundsMiniApp = await MiniApp.findOne({ topicId: topic._id, slug: 'roadmap' });
  if (!soundsMiniApp) throw new Error('Sounds roadmap miniApp not found — run content seed first');

  const allOptions = vowelData.map((v) => v.word);
  const createdQuestionIds: string[] = [];

  for (const v of vowelData) {
    // Term.word has a global unique index, so the query must be by word alone.
    const term = await Term.findOneAndUpdate(
      { word: v.word },
      {
        word: v.word,
        miniAppId: soundsMiniApp._id,
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

    const audioQuestion = await Question.findOneAndUpdate(
      { termId: term._id, type: 'mcq_audio' },
      {
        termId: term._id,
        definitionId: definition._id,
        miniAppId: soundsMiniApp._id,
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
        dialogue: `Hamba ushaye inkinobho "${v.word}"!`,
        dialogueAudioUrl: `sounds/isizulu/avatar/zoe-drag-${v.word}.mp3`,
        emotion: 'excited',
      },
      draggables: [
        {
          id: `vowel-${v.word}`,
          label: v.word,
          imageUrl: `sounds/isizulu/vowels/card-${v.word}.png`,
          audioUrl: v.audioUrl,
        },
        ...otherVowels.map((o) => ({
          id: `vowel-${o.word}`,
          label: o.word,
          imageUrl: `sounds/isizulu/vowels/card-${o.word}.png`,
          audioUrl: o.audioUrl,
        })),
      ],
      dropZones: [{ id: 'zone-main', requiredDraggableIds: [`vowel-${v.word}`], requiredCount: 1 }],
      successFeedback: {
        text: v.successText,
        audioUrl: v.successAudioUrl,
        highlightWords: v.successText.split(' '),
      },
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
        miniAppId: soundsMiniApp._id,
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

  // Link all questions to the practice lesson (idempotent — sets, not pushes).
  await Lesson.findByIdAndUpdate(practiceLessonId, {
    questionIds: createdQuestionIds,
  });

  console.log(
    `  Seeded ${vowelData.length} vowels x 2 question types = ${createdQuestionIds.length} questions`
  );
}

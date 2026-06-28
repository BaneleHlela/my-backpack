// Seed script for the content hierarchy: Field → Subject → Topic → MiniApp,
// plus the IsiZulu Sounds roadmap with lessons and questions.
// Usage: pnpm --filter api seed
// Drops all hierarchy, roadmap, lesson, and question data then re-seeds from scratch.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import Field from './models/core/field.model';
import Subject from './models/core/subject.model';
import Topic from './models/core/topic.model';
import MiniApp from './models/core/miniApp.model';
import Term, { ITermDocument } from './models/apps/language/vocabulary/term.model';
import Definition, { IDefinitionDocument } from './models/apps/language/vocabulary/definition.model';
import Question, { IQuestionDocument } from './models/apps/language/vocabulary/question.model';
import Roadmap from './models/learning/roadmap.model';
import RoadmapNode from './models/learning/roadmapNode.model';
import Lesson from './models/learning/lesson.model';

async function seed(): Promise<void> {
  await connectDB();

  await Promise.all([
    Field.deleteMany({}),
    Subject.deleteMany({}),
    Topic.deleteMany({}),
    MiniApp.deleteMany({}),
    Roadmap.deleteMany({}),
    RoadmapNode.deleteMany({}),
    Lesson.deleteMany({}),
    Term.deleteMany({}),
    Definition.deleteMany({}),
    Question.deleteMany({}),
  ]);

  // ── Content hierarchy ────────────────────────────────────────────────────────

  const language = await Field.create({
    name: 'Language',
    slug: 'language',
    description: 'Languages and linguistic skills',
  });

  const english = await Subject.create({
    fieldId: language._id,
    name: 'English',
    slug: 'english',
    description: 'English language learning',
  });

  const isizulu = await Subject.create({
    fieldId: language._id,
    name: 'IsiZulu Home Language',
    slug: 'isizulu-hl',
    description: 'IsiZulu Home Language',
  });

  const vocabulary = await Topic.create({
    subjectId: english._id,
    name: 'Vocabulary',
    slug: 'vocabulary',
    description: 'English vocabulary building',
  });

  const sounds = await Topic.create({
    subjectId: isizulu._id,
    name: 'Sounds',
    slug: 'sounds',
    description: 'IsiZulu sounds and pronunciation',
  });

  const dictionary = await MiniApp.create({
    topicId: vocabulary._id,
    name: 'Dictionary',
    slug: 'dictionary',
    description: 'Search and study English vocabulary terms',
    type: 'dictionary',
  });

  const vocabQuiz = await MiniApp.create({
    topicId: vocabulary._id,
    name: 'Quiz',
    slug: 'quiz',
    description: 'Test your English vocabulary knowledge',
    type: 'quiz',
  });

  const soundsRoadmapMiniApp = await MiniApp.create({
    topicId: sounds._id,
    name: 'Sounds Roadmap',
    slug: 'roadmap',
    description: 'Learn IsiZulu sounds step by step',
    type: 'roadmap',
  });

  console.log('Seeded hierarchy:');
  console.log('Language');
  console.log('  ├── English');
  console.log('  │     ├── Vocabulary');
  console.log('  │     │     ├── Dictionary:', dictionary._id);
  console.log('  │     │     └── Quiz:', vocabQuiz._id);
  console.log('  └── IsiZulu Home Language');
  console.log('        └── Sounds');
  console.log('              └── Sounds Roadmap:', soundsRoadmapMiniApp._id);

  // ── IsiZulu Sounds Roadmap ───────────────────────────────────────────────────

  const soundsRoadmap = await Roadmap.create({
    subjectId: isizulu._id,
    miniAppId: soundsRoadmapMiniApp._id,
    title: 'IsiZulu Sounds',
    description: 'Learn IsiZulu sounds step by step, from vowels to syllables',
    nodes: [],
  });

  // ── Vowels Node ──────────────────────────────────────────────────────────────
  // Created first without lessons; lessons[] updated after lesson documents are created.

  const vowelsNode = await RoadmapNode.create({
    roadmapId: soundsRoadmap._id,
    title: 'Izinhlamvu Zokuvuma',
    description: 'Learn the five IsiZulu vowel sounds: a, e, i, o, u',
    position: 1,
    type: 'lesson',
    curriculumTags: [
      { curriculum: 'CAPS', gradeLevel: '1' },
      { curriculum: 'CAPS', gradeLevel: '2' },
    ],
    unlockRequires: [],
    rewards: { xp: 50, peanuts: 10 },
    lessons: [],
  });

  // ── Three lessons for the vowels node ────────────────────────────────────────

  // Lesson 1 — Introduction: auto-completes when study material is viewed.
  const vowelsIntroLesson = await Lesson.create({
    nodeId: vowelsNode._id,
    roadmapId: soundsRoadmap._id,
    position: 1,
    title: 'Meet the Vowels',
    lessonType: 'introduction',
    studyMaterial: {
      notes: `# Izinhlamvu Zokuvuma (Vowels)\n\nIsiZulu has 5 vowel sounds:\n\n- **a** — as in "amanzi" (water)\n- **e** — as in "ekhaya" (at home)\n- **i** — as in "inkosi" (chief)\n- **o** — as in "omama" (mothers)\n- **u** — as in "ubuntu" (humanity)`,
    },
    questionIds: [],
    passingScore: 0,
  });

  // Lesson 2 — Practice: low pressure, auto-completes after all questions attempted once.
  const vowelsPracticeLesson = await Lesson.create({
    nodeId: vowelsNode._id,
    roadmapId: soundsRoadmap._id,
    position: 2,
    title: 'Hear the Vowels',
    lessonType: 'practice',
    questionIds: [],
    passingScore: 0,
  });

  // Lesson 3 — Assessment: must pass to complete the node.
  const vowelsAssessmentLesson = await Lesson.create({
    nodeId: vowelsNode._id,
    roadmapId: soundsRoadmap._id,
    position: 3,
    title: 'Vowels Challenge',
    lessonType: 'assessment',
    questionIds: [],
    passingScore: 0.7,
  });

  // Update vowelsNode with ordered lessons array.
  await RoadmapNode.findByIdAndUpdate(vowelsNode._id, {
    lessons: [
      { lessonId: vowelsIntroLesson._id, position: 1 },
      { lessonId: vowelsPracticeLesson._id, position: 2 },
      { lessonId: vowelsAssessmentLesson._id, position: 3 },
    ],
  });

  // Update roadmap with nodes array.
  await Roadmap.findByIdAndUpdate(soundsRoadmap._id, {
    nodes: [{ nodeId: vowelsNode._id, position: 1 }],
  });

  // ── Sound Terms for Vowels ───────────────────────────────────────────────────

  const vowelData = [
    {
      word: 'a',
      phonetic: 'ah',
      audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/a.mp3',
      definition: "The vowel sound 'a' — as in 'amanzi' (water)",
      examples: ['amanzi', 'amasi', 'abafana'],
    },
    {
      word: 'e',
      phonetic: 'eh',
      audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/e.mp3',
      definition: "The vowel sound 'e' — as in 'ekhaya' (at home)",
      examples: ['ekhaya', 'emini', 'ezansi'],
    },
    {
      word: 'i',
      phonetic: 'ee',
      audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/i.mp3',
      definition: "The vowel sound 'i' — as in 'inkosi' (chief)",
      examples: ['inkosi', 'indlela', 'izulu'],
    },
    {
      word: 'o',
      phonetic: 'oh',
      audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/o.mp3',
      definition: "The vowel sound 'o' — as in 'omama' (mothers)",
      examples: ['omama', 'obaba', 'ogogo'],
    },
    {
      word: 'u',
      phonetic: 'oo',
      audioUrl: 'https://storage.googleapis.com/my-backpack-assets/sounds/isizulu/vowels/u.mp3',
      definition: "The vowel sound 'u' — as in 'ubuntu' (humanity)",
      examples: ['ubuntu', 'umuntu', 'umuzi'],
    },
  ];

  const vowelTerms: { term: ITermDocument; definition: IDefinitionDocument }[] = [];

  for (const v of vowelData) {
    const term = await Term.create({
      word: v.word,
      miniAppId: soundsRoadmapMiniApp._id,
      phonetic: v.phonetic,
      audioUrl: v.audioUrl,
      source: 'manual',
      aiGenerationStatus: 'not_needed',
    });

    const definition = await Definition.create({
      termId: term._id,
      partOfSpeech: 'vowel',
      definition: v.definition,
      examples: v.examples,
      order: 0,
    });

    vowelTerms.push({ term, definition });
  }

  // ── Questions ────────────────────────────────────────────────────────────────
  // All practice questions → vowelsPracticeLesson (lesson 2).

  const mcqAudioQuestions: IQuestionDocument[] = [];

  for (const { term, definition } of vowelTerms) {
    const q = await Question.create({
      termId: term._id,
      definitionId: definition._id,
      miniAppId: soundsRoadmapMiniApp._id,
      nodeId: vowelsNode._id,
      type: 'mcq_audio',
      maxPoints: 4,
      pointsCanBePartial: false,
      source: 'manual',
      isGeneric: true,
      content: {
        prompt: `audio:sounds/isizulu/questions/khetha-umsindo-${term.word}.mp3`,
        options: ['a', 'e', 'i', 'o', 'u'],
        correctAnswer: term.word,
        explanation: `Umsindo ofanele ngu-"${term.word}" — ${definition.definition}`,
        successFeedback: {
          text: `Kulungile! Umsindo ngu-"${term.word}"!`,
          audioUrl: `sounds/isizulu/feedback/correct-${term.word}.mp3`,
        },
        tryAgainFeedback: {
          text: 'Zama futhi!',
          audioUrl: 'sounds/isizulu/feedback/try-again.mp3',
        },
        defaultHelpers: {
          autoReadPrompt: true,
          autoReadOptions: true,
          autoSubmit: true,
          hintsAllowed: 3,
          hintDelaySeconds: 10,
        },
      },
    });
    mcqAudioQuestions.push(q);
  }

  // DnD question for vowel "a".
  const { term: aTerm, definition: aDefinition } = vowelTerms[0];

  const dndAQuestion = await Question.create({
    termId: aTerm._id,
    definitionId: aDefinition._id,
    miniAppId: soundsRoadmapMiniApp._id,
    nodeId: vowelsNode._id,
    type: 'dnd_single',
    maxPoints: 4,
    pointsCanBePartial: false,
    source: 'manual',
    isGeneric: true,
    content: {
      avatar: {
        avatarId: 'zoe',
        dialogue: 'Heyi! Hamba ushaye inkinobho "a"!',
        dialogueAudioUrl: 'sounds/isizulu/avatar/zoe-drag-a.mp3',
        emotion: 'excited',
      },
      draggables: [
        { id: 'vowel-a', label: 'a', imageUrl: 'sounds/isizulu/vowels/card-a.png', audioUrl: 'sounds/isizulu/vowels/a.mp3' },
        { id: 'vowel-e', label: 'e', imageUrl: 'sounds/isizulu/vowels/card-e.png', audioUrl: 'sounds/isizulu/vowels/e.mp3' },
        { id: 'vowel-i', label: 'i', imageUrl: 'sounds/isizulu/vowels/card-i.png', audioUrl: 'sounds/isizulu/vowels/i.mp3' },
      ],
      dropZones: [{ id: 'zone-main', requiredDraggableIds: ['vowel-a'], requiredCount: 1 }],
      successFeedback: { text: 'Yebo! Ngu-"A"!', audioUrl: 'sounds/isizulu/feedback/correct-a.mp3', highlightWords: ['Yebo', 'Ngu', 'A'] },
      tryAgainFeedback: { text: 'Zama futhi!', audioUrl: 'sounds/isizulu/feedback/try-again.mp3' },
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
    },
  });

  // Assign all questions to the practice lesson (lesson 2).
  const practiceQuestionIds = [
    ...mcqAudioQuestions.map((q) => q._id),
    dndAQuestion._id,
  ];

  await Lesson.findByIdAndUpdate(vowelsPracticeLesson._id, {
    questionIds: practiceQuestionIds,
  });

  console.log('\nSeeded IsiZulu Sounds roadmap:');
  console.log('  Roadmap: IsiZulu Sounds (subjectId:', isizulu._id, ')');
  console.log('  Node 1: Izinhlamvu Zokuvuma (Vowels)');
  console.log('    Lesson 1: Meet the Vowels (introduction)');
  console.log('    Lesson 2: Hear the Vowels (practice) —', practiceQuestionIds.length, 'questions');
  console.log('    Lesson 3: Vowels Challenge (assessment)');
  console.log('  Sound terms created:', vowelTerms.length);
  console.log('  mcq_audio questions:', mcqAudioQuestions.length);
  console.log('  dnd_single questions: 1 (vowel "a")');
  console.log('  Total questions:', practiceQuestionIds.length);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());

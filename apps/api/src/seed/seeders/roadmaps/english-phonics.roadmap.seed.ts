// Seeds the English "English Phonics" roadmap: two nodes — "Vowel Sounds" (1 lesson item +
// 6 quiz items, per docs/content/vowels-dnd-quiz-design.md) then "Three-Letter Words" (1
// lesson item + 2 quiz items — was practice + assessment). Same pattern as
// isizulu-hl.roadmap.seed.ts and math-foundation.roadmap.seed.ts. Idempotent — re-running
// updates existing records.
//
// Both nodes' `items[]` (the quiz items specifically) are written by their respective
// question-seed files (english/vowels.questions.ts, english/cvc-words.questions.ts), which
// know the Quiz ids — this seeder only creates the intro Lesson + node scaffolding.
import Roadmap from '../../../models/learning/roadmap.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
import Lesson from '../../../models/learning/lesson.model';
import Subject from '../../../models/core/subject.model';
import { seedVowelsLessonSequence } from './vowelsLessonSequence';

export interface EnglishPhonicsRoadmapSeedResult {
  roadmapId: string;
  vowelsNodeId: string;
  vowelsIntroLessonId: string;
  cvcNodeId: string;
  cvcIntroLessonId: string;
}

export async function seedEnglishPhonicsRoadmap(): Promise<EnglishPhonicsRoadmapSeedResult> {
  console.log('Seeding English Phonics roadmap...');

  const subject = await Subject.findOne({ slug: 'english' });
  if (!subject) throw new Error('English subject not found — run content seed first');

  const roadmap = await Roadmap.findOneAndUpdate(
    { subjectId: subject._id, title: 'English Phonics' },
    {
      subjectId: subject._id,
      title: 'English Phonics',
      description: 'Learn English letter sounds and words step by step',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // ── Node 1: Vowel Sounds ───────────────────────────────────

  const vowelsNode = await RoadmapNode.findOneAndUpdate(
    { roadmapId: roadmap._id, title: 'Vowel Sounds' },
    {
      roadmapId: roadmap._id,
      title: 'Vowel Sounds',
      description: 'Learn the five short vowel sounds: a, e, i, o, u',
      position: 1,
      type: 'lesson',
      curriculumTags: [
        { curriculum: 'CAPS', gradeLevel: 'r' },
        { curriculum: 'CAPS', gradeLevel: '1' },
      ],
      unlockRequires: [],
      rewards: { xp: 50, peanuts: 10 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const { introLessonId: vowelsIntroLessonId } = await seedVowelsLessonSequence({
    nodeId: vowelsNode._id,
    roadmapId: roadmap._id,
    introTitle: 'Meet the Vowels',
    introVideoUrl: 'https://www.youtube.com/watch?v=gp1UmVSlLJ4',
    introNotes: '# Vowel Sounds\n\nLetters can make sounds: a, e, i, o, u. Listen and learn!',
  });

  // ── Node 2: Three-Letter Words (CVC words) ─────────────────

  const cvcNode = await RoadmapNode.findOneAndUpdate(
    { roadmapId: roadmap._id, title: 'Three-Letter Words' },
    {
      roadmapId: roadmap._id,
      title: 'Three-Letter Words',
      description: 'Build and recognise simple consonant-vowel-consonant (CVC) words',
      position: 2,
      type: 'lesson',
      curriculumTags: [{ curriculum: 'CAPS', gradeLevel: '1' }],
      unlockRequires: [],
      rewards: { xp: 50, peanuts: 10 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const cvcIntroLesson = await Lesson.findOneAndUpdate(
    { nodeId: cvcNode._id, position: 1 },
    {
      nodeId: cvcNode._id,
      roadmapId: roadmap._id,
      position: 1,
      title: 'Building Words',
      resources: [
        {
          type: 'notes',
          position: 1,
          markdown: '# Three-Letter Words\n\nListen to a word, then build it letter by letter!',
        },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Superseded by direct quiz items on node.items[] (not extended) — delete the old
  // practice/assessment quiz-wrapper Lessons that occupied positions 2-3.
  await Lesson.deleteMany({ nodeId: cvcNode._id, position: { $in: [2, 3] } });

  await Roadmap.findByIdAndUpdate(roadmap._id, {
    nodes: [
      { nodeId: vowelsNode._id, position: 1 },
      { nodeId: cvcNode._id, position: 2 },
    ],
  });

  console.log('  Seeded English Phonics roadmap: 2 nodes, 2 intro lessons (quiz items added separately)');

  return {
    roadmapId: roadmap._id.toString(),
    vowelsNodeId: vowelsNode._id.toString(),
    vowelsIntroLessonId,
    cvcNodeId: cvcNode._id.toString(),
    cvcIntroLessonId: cvcIntroLesson._id.toString(),
  };
}

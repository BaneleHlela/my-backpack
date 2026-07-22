// Seeds the IsiZulu HL "Sounds" course + roadmap: the vowels node (1 lesson item + 6 quiz
// items, per docs/content/vowels-dnd-quiz-design.md) and the consonants node (1 lesson item +
// 2 quiz items — was practice + assessment). Idempotent — re-running updates existing
// records. Requires content.seed.ts to have run first (needs the subject).
//
// Course-first: upserts the Course by (subjectId, slug), then resolves the Roadmap via
// course.roadmapId if it already exists (e.g. adopted from the one-time migration — see
// seed/migrations/2026-07-course-roadmap-restructure.ts) or creates a new one otherwise.
//
// Both nodes' `items[]` (the quiz items specifically) are written by their respective
// question-seed files (isizulu/vowels.questions.ts, isizulu/consonants.questions.ts), which
// know the Quiz ids — this seeder only creates the intro Lesson + node scaffolding.
import Course from '../../../models/core/course.model';
import Roadmap from '../../../models/learning/roadmap.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
import Lesson from '../../../models/learning/lesson.model';
import Subject from '../../../models/core/subject.model';
import { seedVowelsLessonSequence } from './vowelsLessonSequence';

export interface IsiZuluRoadmapSeedResult {
  roadmapId: string;
  vowelsNodeId: string;
  vowelsIntroLessonId: string;
  consonantsNodeId: string;
  consonantsIntroLessonId: string;
}

export async function seedIsiZuluRoadmap(): Promise<IsiZuluRoadmapSeedResult> {
  console.log('Seeding IsiZulu Sounds course...');

  const subject = await Subject.findOne({ slug: 'isizulu-hl' });
  if (!subject) throw new Error('IsiZulu HL subject not found — run content seed first');

  const course = await Course.findOneAndUpdate(
    { subjectId: subject._id, slug: 'sounds' },
    {
      subjectId: subject._id,
      name: 'Sounds',
      slug: 'sounds',
      description: 'Learn IsiZulu sounds step by step, from vowels to syllables',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let roadmap;
  if (course.roadmapId) {
    roadmap = await Roadmap.findByIdAndUpdate(
      course.roadmapId,
      {
        title: 'IsiZulu Sounds',
        description: 'Learn IsiZulu sounds step by step, from vowels to syllables',
      },
      { new: true }
    );
  } else {
    roadmap = await Roadmap.create({
      title: 'IsiZulu Sounds',
      description: 'Learn IsiZulu sounds step by step, from vowels to syllables',
      nodes: [],
    });
    course.roadmapId = roadmap._id;
    await course.save();
  }
  if (!roadmap) throw new Error('Failed to resolve IsiZulu Sounds roadmap');

  const vowelsNode = await RoadmapNode.findOneAndUpdate(
    { roadmapId: roadmap._id, title: 'Izinhlamvu Zokuvuma' },
    {
      roadmapId: roadmap._id,
      title: 'Izinhlamvu Zokuvuma',
      slug: 'izinhlamvu-zokuvuma',
      description: 'Learn the five IsiZulu vowel sounds: a, e, i, o, u',
      position: 1,
      type: 'lesson',
      curriculumTags: [
        { curriculum: 'CAPS', gradeLevel: '1' },
        { curriculum: 'CAPS', gradeLevel: '2' },
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
    introNotes:
      '# Izinhlamvu Zokuvuma (Vowels)\n\nIsiZulu has 5 vowel sounds:\n\n- **a** — as in "amanzi" (water)\n- **e** — as in "ekhaya" (at home)\n- **i** — as in "inkosi" (chief)\n- **o** — as in "omama" (mothers)\n- **u** — as in "ubuntu" (humanity)',
  });

  // ── Node 2: Izinhlamvu Zongwaqa (Consonants) ──────────────
  // Confirmed via isiZulu linguistics sources (onkamisa = vowels, ongwaqa = consonants) —
  // still flagged for a native-speaker check before this ships, same as the vowel audio.

  const consonantsNode = await RoadmapNode.findOneAndUpdate(
    { roadmapId: roadmap._id, title: 'Izinhlamvu Zongwaqa' },
    {
      roadmapId: roadmap._id,
      title: 'Izinhlamvu Zongwaqa',
      slug: 'izinhlamvu-zongwaqa',
      description: 'Learn IsiZulu consonants paired with each vowel sound',
      position: 2,
      type: 'lesson',
      curriculumTags: [
        { curriculum: 'CAPS', gradeLevel: '1' },
        { curriculum: 'CAPS', gradeLevel: '2' },
      ],
      unlockRequires: [],
      rewards: { xp: 50, peanuts: 10 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const consonantsIntroLesson = await Lesson.findOneAndUpdate(
    { nodeId: consonantsNode._id, position: 1 },
    {
      nodeId: consonantsNode._id,
      roadmapId: roadmap._id,
      position: 1,
      title: 'Meet the Consonants',
      resources: [
        {
          type: 'notes',
          position: 1,
          markdown:
            '# Izinhlamvu Zongwaqa (Consonants)\n\nConsonants combine with each vowel to make new sounds:\n\n- **b** — ba, be, bi, bo, bu\n- **c** — ca, ce, ci, co, cu',
        },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Superseded by direct quiz items on node.items[] (not extended) — delete the old
  // practice/assessment quiz-wrapper Lessons that occupied positions 2-3.
  await Lesson.deleteMany({ nodeId: consonantsNode._id, position: { $in: [2, 3] } });

  await Roadmap.findByIdAndUpdate(roadmap._id, {
    nodes: [
      { nodeId: vowelsNode._id, position: 1 },
      { nodeId: consonantsNode._id, position: 2 },
    ],
  });

  console.log('  Seeded IsiZulu Sounds course: 2 nodes, 2 intro lessons (quiz items added separately)');

  return {
    roadmapId: roadmap._id.toString(),
    vowelsNodeId: vowelsNode._id.toString(),
    vowelsIntroLessonId,
    consonantsNodeId: consonantsNode._id.toString(),
    consonantsIntroLessonId: consonantsIntroLesson._id.toString(),
  };
}

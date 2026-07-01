// Seeds the Foundation Phase Mathematics "Number Sense Roadmap": two nodes —
// "Let's Learn to Drag!" (DnD mechanic intro, 1 lesson item + 2 quiz items) then
// "Counting 1 to 10" (1 lesson item + 2 quiz items). Same pattern as
// isizulu-hl.roadmap.seed.ts. Idempotent — re-running updates existing records.
//
// Both nodes' `items[]` (the quiz items specifically) are written by their respective
// question-seed files (drag-intro.questions.ts, counting.questions.ts), which know the Quiz
// ids — this seeder only creates the intro Lesson + node scaffolding.
import Roadmap from '../../../models/learning/roadmap.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
import Lesson from '../../../models/learning/lesson.model';
import Subject from '../../../models/core/subject.model';

export interface MathFoundationRoadmapSeedResult {
  roadmapId: string;
  dragNodeId: string;
  dragIntroLessonId: string;
  countingNodeId: string;
  countingIntroLessonId: string;
}

export async function seedMathFoundationRoadmap(): Promise<MathFoundationRoadmapSeedResult> {
  console.log('Seeding Foundation Phase Mathematics roadmap...');

  const subject = await Subject.findOne({ slug: 'foundation-phase-mathematics' });
  if (!subject) {
    throw new Error('Foundation Phase Mathematics subject not found — run content seed first');
  }

  const roadmap = await Roadmap.findOneAndUpdate(
    { subjectId: subject._id },
    {
      subjectId: subject._id,
      title: 'Number Sense Roadmap',
      description: 'Learn to interact, then count, step by step',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // ── Node 1: Let's Learn to Drag! ──────────────────────────

  const dragNode = await RoadmapNode.findOneAndUpdate(
    { roadmapId: roadmap._id, title: "Let's Learn to Drag!" },
    {
      roadmapId: roadmap._id,
      title: "Let's Learn to Drag!",
      description: 'Learn the drag-and-drop mechanic with everyday objects',
      position: 1,
      type: 'lesson',
      curriculumTags: [{ curriculum: 'CAPS', gradeLevel: 'r' }],
      unlockRequires: [],
      rewards: { xp: 30, peanuts: 5 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const dragIntroLesson = await Lesson.findOneAndUpdate(
    { nodeId: dragNode._id, position: 1 },
    {
      nodeId: dragNode._id,
      roadmapId: roadmap._id,
      position: 1,
      title: "Let's Play!",
      resources: [
        {
          type: 'notes',
          position: 1,
          markdown: "# Let's Play!\n\nDrag things to where they belong. Ready? Let's go!",
        },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Superseded by direct quiz items on node.items[] (not extended) — delete the old
  // practice/assessment quiz-wrapper Lessons that occupied positions 2-3.
  await Lesson.deleteMany({ nodeId: dragNode._id, position: { $in: [2, 3] } });

  // ── Node 2: Counting 1 to 10 (existing, shifted to position 2) ──

  const countingNode = await RoadmapNode.findOneAndUpdate(
    { roadmapId: roadmap._id, title: 'Counting 1 to 10' },
    {
      roadmapId: roadmap._id,
      title: 'Counting 1 to 10',
      description: 'Learn to recognise and count numbers from 1 to 10',
      position: 2,
      type: 'lesson',
      curriculumTags: [{ curriculum: 'CAPS', gradeLevel: 'r' }],
      unlockRequires: [],
      rewards: { xp: 50, peanuts: 10 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const countingIntroLesson = await Lesson.findOneAndUpdate(
    { nodeId: countingNode._id, position: 1 },
    {
      nodeId: countingNode._id,
      roadmapId: roadmap._id,
      position: 1,
      title: 'What is counting?',
      resources: [
        {
          type: 'notes',
          position: 1,
          markdown:
            '# Counting\n\nCounting is saying numbers in order to find out how many things there are.\n\nWe count from 1 to 10: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.',
        },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Superseded by direct quiz items on node.items[] (not extended) — delete the old
  // practice/assessment quiz-wrapper Lessons that occupied positions 2-3.
  await Lesson.deleteMany({ nodeId: countingNode._id, position: { $in: [2, 3] } });

  await Roadmap.findByIdAndUpdate(roadmap._id, {
    nodes: [
      { nodeId: dragNode._id, position: 1 },
      { nodeId: countingNode._id, position: 2 },
    ],
  });

  console.log('  Seeded Number Sense Roadmap: 2 nodes, 2 intro lessons (quiz items added separately)');

  return {
    roadmapId: roadmap._id.toString(),
    dragNodeId: dragNode._id.toString(),
    dragIntroLessonId: dragIntroLesson._id.toString(),
    countingNodeId: countingNode._id.toString(),
    countingIntroLessonId: countingIntroLesson._id.toString(),
  };
}

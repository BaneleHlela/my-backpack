// Seeds the Foundation Phase Mathematics "Number Sense Roadmap": two nodes —
// "Let's Learn to Drag!" (DnD mechanic intro) then "Counting 1 to 10".
// Same pattern as isizulu-hl.roadmap.seed.ts. Idempotent — re-running updates existing records.
// Practice/assessment lessons are seeded with no quizId — questions/quizzes are added later via
// dedicated question seed files (drag-intro.questions.ts, counting.questions.ts), the same way
// vowels.questions.ts works for isiZulu.
import Roadmap from '../../../models/learning/roadmap.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
import Lesson from '../../../models/learning/lesson.model';
import Subject from '../../../models/core/subject.model';

export interface MathFoundationRoadmapSeedResult {
  roadmapId: string;
  dragNodeId: string;
  dragPracticeLessonId: string;
  dragAssessmentLessonId: string;
  countingNodeId: string;
  practiceLessonId: string;
  assessmentLessonId: string;
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
      lessonType: 'introduction',
      studyMaterial: {
        notes: "# Let's Play!\n\nDrag things to where they belong. Ready? Let's go!",
      },
      passingScore: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const dragPracticeLesson = await Lesson.findOneAndUpdate(
    { nodeId: dragNode._id, position: 2 },
    {
      nodeId: dragNode._id,
      roadmapId: roadmap._id,
      position: 2,
      title: 'Practice Dragging',
      lessonType: 'practice',
      passingScore: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const dragAssessmentLesson = await Lesson.findOneAndUpdate(
    { nodeId: dragNode._id, position: 3 },
    {
      nodeId: dragNode._id,
      roadmapId: roadmap._id,
      position: 3,
      title: 'Dragging Challenge',
      lessonType: 'assessment',
      passingScore: 0.7,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await RoadmapNode.findByIdAndUpdate(dragNode._id, {
    lessons: [
      { lessonId: dragIntroLesson._id, position: 1 },
      { lessonId: dragPracticeLesson._id, position: 2 },
      { lessonId: dragAssessmentLesson._id, position: 3 },
    ],
  });

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

  const introLesson = await Lesson.findOneAndUpdate(
    { nodeId: countingNode._id, position: 1 },
    {
      nodeId: countingNode._id,
      roadmapId: roadmap._id,
      position: 1,
      title: 'What is counting?',
      lessonType: 'introduction',
      studyMaterial: {
        notes:
          '# Counting\n\nCounting is saying numbers in order to find out how many things there are.\n\nWe count from 1 to 10: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.',
      },
      passingScore: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const practiceLesson = await Lesson.findOneAndUpdate(
    { nodeId: countingNode._id, position: 2 },
    {
      nodeId: countingNode._id,
      roadmapId: roadmap._id,
      position: 2,
      title: 'Practice Counting',
      lessonType: 'practice',
      passingScore: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const assessmentLesson = await Lesson.findOneAndUpdate(
    { nodeId: countingNode._id, position: 3 },
    {
      nodeId: countingNode._id,
      roadmapId: roadmap._id,
      position: 3,
      title: 'Counting Challenge',
      lessonType: 'assessment',
      passingScore: 0.7,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await RoadmapNode.findByIdAndUpdate(countingNode._id, {
    lessons: [
      { lessonId: introLesson._id, position: 1 },
      { lessonId: practiceLesson._id, position: 2 },
      { lessonId: assessmentLesson._id, position: 3 },
    ],
  });

  await Roadmap.findByIdAndUpdate(roadmap._id, {
    nodes: [
      { nodeId: dragNode._id, position: 1 },
      { nodeId: countingNode._id, position: 2 },
    ],
  });

  console.log('  Seeded Number Sense Roadmap: 2 nodes, 6 lessons (questions added separately)');

  return {
    roadmapId: roadmap._id.toString(),
    dragNodeId: dragNode._id.toString(),
    dragPracticeLessonId: dragPracticeLesson._id.toString(),
    dragAssessmentLessonId: dragAssessmentLesson._id.toString(),
    countingNodeId: countingNode._id.toString(),
    practiceLessonId: practiceLesson._id.toString(),
    assessmentLessonId: assessmentLesson._id.toString(),
  };
}

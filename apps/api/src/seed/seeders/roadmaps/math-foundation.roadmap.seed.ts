// Seeds the Foundation Phase Mathematics "Counting 1 to 10" roadmap: one node with 3 lessons.
// Same pattern as isizulu-hl.roadmap.seed.ts. Idempotent — re-running updates existing records.
// Practice/assessment lessons are seeded with no quizId — counting questions/quizzes are added
// later via a dedicated math questions seed file, the same way vowels.questions.ts works.
import Roadmap from '../../../models/learning/roadmap.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
import Lesson from '../../../models/learning/lesson.model';
import Subject from '../../../models/core/subject.model';

export interface MathFoundationRoadmapSeedResult {
  roadmapId: string;
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
      title: 'Counting 1 to 10',
      description: 'Learn to count from 1 to 10 step by step',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const countingNode = await RoadmapNode.findOneAndUpdate(
    { roadmapId: roadmap._id, title: 'Counting 1 to 10' },
    {
      roadmapId: roadmap._id,
      title: 'Counting 1 to 10',
      description: 'Learn to recognise and count numbers from 1 to 10',
      position: 1,
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
    nodes: [{ nodeId: countingNode._id, position: 1 }],
  });

  console.log('  Seeded Counting 1 to 10 roadmap: 1 node, 3 lessons (no questions yet)');

  return {
    roadmapId: roadmap._id.toString(),
    countingNodeId: countingNode._id.toString(),
    practiceLessonId: practiceLesson._id.toString(),
    assessmentLessonId: assessmentLesson._id.toString(),
  };
}

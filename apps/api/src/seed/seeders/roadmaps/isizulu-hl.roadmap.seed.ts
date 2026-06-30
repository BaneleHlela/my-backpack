// Seeds the IsiZulu HL "IsiZulu Sounds" roadmap: one node with 3 lessons. Idempotent — re-running
// updates existing records. Requires content.seed.ts to have run first (needs the subject).
import Roadmap from '../../../models/learning/roadmap.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
import Lesson from '../../../models/learning/lesson.model';
import Subject from '../../../models/core/subject.model';

export interface IsiZuluRoadmapSeedResult {
  roadmapId: string;
  vowelsNodeId: string;
  practiceLessonId: string;
  assessmentLessonId: string;
}

export async function seedIsiZuluRoadmap(): Promise<IsiZuluRoadmapSeedResult> {
  console.log('Seeding IsiZulu HL roadmap...');

  const subject = await Subject.findOne({ slug: 'isizulu-hl' });
  if (!subject) throw new Error('IsiZulu HL subject not found — run content seed first');

  const roadmap = await Roadmap.findOneAndUpdate(
    { subjectId: subject._id },
    {
      subjectId: subject._id,
      title: 'IsiZulu Sounds',
      description: 'Learn IsiZulu sounds step by step, from vowels to syllables',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const vowelsNode = await RoadmapNode.findOneAndUpdate(
    { roadmapId: roadmap._id, title: 'Izinhlamvu Zokuvuma' },
    {
      roadmapId: roadmap._id,
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
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const introLesson = await Lesson.findOneAndUpdate(
    { nodeId: vowelsNode._id, position: 1 },
    {
      nodeId: vowelsNode._id,
      roadmapId: roadmap._id,
      position: 1,
      title: 'Meet the Vowels',
      lessonType: 'introduction',
      studyMaterial: {
        notes:
          '# Izinhlamvu Zokuvuma (Vowels)\n\nIsiZulu has 5 vowel sounds:\n\n- **a** — as in "amanzi" (water)\n- **e** — as in "ekhaya" (at home)\n- **i** — as in "inkosi" (chief)\n- **o** — as in "omama" (mothers)\n- **u** — as in "ubuntu" (humanity)',
      },
      questionIds: [],
      passingScore: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const practiceLesson = await Lesson.findOneAndUpdate(
    { nodeId: vowelsNode._id, position: 2 },
    {
      nodeId: vowelsNode._id,
      roadmapId: roadmap._id,
      position: 2,
      title: 'Hear the Vowels',
      lessonType: 'practice',
      passingScore: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const assessmentLesson = await Lesson.findOneAndUpdate(
    { nodeId: vowelsNode._id, position: 3 },
    {
      nodeId: vowelsNode._id,
      roadmapId: roadmap._id,
      position: 3,
      title: 'Vowels Challenge',
      lessonType: 'assessment',
      passingScore: 0.7,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await RoadmapNode.findByIdAndUpdate(vowelsNode._id, {
    lessons: [
      { lessonId: introLesson._id, position: 1 },
      { lessonId: practiceLesson._id, position: 2 },
      { lessonId: assessmentLesson._id, position: 3 },
    ],
  });

  await Roadmap.findByIdAndUpdate(roadmap._id, {
    nodes: [{ nodeId: vowelsNode._id, position: 1 }],
  });

  console.log('  Seeded IsiZulu Sounds roadmap: 1 node, 3 lessons');

  return {
    roadmapId: roadmap._id.toString(),
    vowelsNodeId: vowelsNode._id.toString(),
    practiceLessonId: practiceLesson._id.toString(),
    assessmentLessonId: assessmentLesson._id.toString(),
  };
}

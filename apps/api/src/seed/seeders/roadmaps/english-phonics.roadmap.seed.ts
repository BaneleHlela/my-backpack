// Seeds the English "English Phonics" roadmap: two nodes — "Vowel Sounds" then
// "Three-Letter Words". Same pattern as isizulu-hl.roadmap.seed.ts and
// math-foundation.roadmap.seed.ts. Idempotent — re-running updates existing records.
// Practice/assessment lessons are seeded with no quizId — questions/quizzes are added later via
// the english/vowels.questions.ts and english/cvc-words.questions.ts seed files.
import Roadmap from '../../../models/learning/roadmap.model';
import RoadmapNode from '../../../models/learning/roadmapNode.model';
import Lesson from '../../../models/learning/lesson.model';
import Subject from '../../../models/core/subject.model';

export interface EnglishPhonicsRoadmapSeedResult {
  roadmapId: string;
  vowelsNodeId: string;
  vowelsPracticeLessonId: string;
  vowelsAssessmentLessonId: string;
  cvcNodeId: string;
  cvcPracticeLessonId: string;
  cvcAssessmentLessonId: string;
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

  const vowelsIntroLesson = await Lesson.findOneAndUpdate(
    { nodeId: vowelsNode._id, position: 1 },
    {
      nodeId: vowelsNode._id,
      roadmapId: roadmap._id,
      position: 1,
      title: 'Meet the Vowels',
      lessonType: 'introduction',
      studyMaterial: {
        notes: '# Vowel Sounds\n\nLetters can make sounds: a, e, i, o, u. Listen and learn!',
      },
      passingScore: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const vowelsPracticeLesson = await Lesson.findOneAndUpdate(
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

  const vowelsAssessmentLesson = await Lesson.findOneAndUpdate(
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
      { lessonId: vowelsIntroLesson._id, position: 1 },
      { lessonId: vowelsPracticeLesson._id, position: 2 },
      { lessonId: vowelsAssessmentLesson._id, position: 3 },
    ],
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
      lessonType: 'introduction',
      studyMaterial: {
        notes: '# Three-Letter Words\n\nListen to a word, then build it letter by letter!',
      },
      passingScore: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const cvcPracticeLesson = await Lesson.findOneAndUpdate(
    { nodeId: cvcNode._id, position: 2 },
    {
      nodeId: cvcNode._id,
      roadmapId: roadmap._id,
      position: 2,
      title: 'Practice Building Words',
      lessonType: 'practice',
      passingScore: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const cvcAssessmentLesson = await Lesson.findOneAndUpdate(
    { nodeId: cvcNode._id, position: 3 },
    {
      nodeId: cvcNode._id,
      roadmapId: roadmap._id,
      position: 3,
      title: 'Word Building Challenge',
      lessonType: 'assessment',
      passingScore: 0.7,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await RoadmapNode.findByIdAndUpdate(cvcNode._id, {
    lessons: [
      { lessonId: cvcIntroLesson._id, position: 1 },
      { lessonId: cvcPracticeLesson._id, position: 2 },
      { lessonId: cvcAssessmentLesson._id, position: 3 },
    ],
  });

  await Roadmap.findByIdAndUpdate(roadmap._id, {
    nodes: [
      { nodeId: vowelsNode._id, position: 1 },
      { nodeId: cvcNode._id, position: 2 },
    ],
  });

  console.log('  Seeded English Phonics roadmap: 2 nodes, 6 lessons (questions added separately)');

  return {
    roadmapId: roadmap._id.toString(),
    vowelsNodeId: vowelsNode._id.toString(),
    vowelsPracticeLessonId: vowelsPracticeLesson._id.toString(),
    vowelsAssessmentLessonId: vowelsAssessmentLesson._id.toString(),
    cvcNodeId: cvcNode._id.toString(),
    cvcPracticeLessonId: cvcPracticeLesson._id.toString(),
    cvcAssessmentLessonId: cvcAssessmentLesson._id.toString(),
  };
}

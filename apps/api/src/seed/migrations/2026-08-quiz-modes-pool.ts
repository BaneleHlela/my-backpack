// One-time backfill for mobile's Quiz Modes feature — every Course needs exactly one
// mode:'pool', isDefault:true Quiz so `POST /api/quiz/session { miniAppId: course._id }`
// resolves the same way it already does for Dictionary's dynamic quiz (previously it 404'd —
// "No default quiz configured for this mini-app" — for every roadmap course). New courses get
// one automatically now (see studio/course.service.ts's createCourse); this script backfills
// courses that already existed before that change landed.
//
// Usage: pnpm --filter api migrate:quiz-modes-pool
//
// Check-before-write, safe to re-run if interrupted: skips any Course that already has a
// {mode:'pool', isDefault:true} Quiz. Purely additive — creates new Quiz documents only, never
// modifies or deletes anything, so there's no real risk to back up against, but if you want to
// be extra careful, back up the `quizzes` collection first.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../../config/db';
import Course from '../../models/core/course.model';
import Quiz from '../../models/learning/quiz.model';

async function backfillCourse(course: { _id: mongoose.Types.ObjectId; name: string }): Promise<void> {
  const existing = await Quiz.findOne({ miniAppId: course._id, mode: 'pool', isDefault: true });
  if (existing) {
    console.log(`  [skip] Course '${course.name}' (${course._id}) already has a pool quiz`);
    return;
  }

  await Quiz.create({
    miniAppId: course._id,
    sourceMiniAppIds: [course._id],
    title: `${course.name} Practice Pool`,
    mode: 'pool',
    questionIds: [],
    settings: {
      questionCount: 200,
      questionTypes: [],
      bucketFilter: 'all',
      feedbackMode: 'immediate',
      shuffleQuestions: false,
    },
    isUserAdjustable: true,
    isDefault: true,
    isActive: true,
  });
  console.log(`  Created pool quiz for course '${course.name}' (${course._id})`);
}

async function runMigration(): Promise<void> {
  await connectDB();

  try {
    const courses = await Course.find({ isActive: true });
    console.log(`Found ${courses.length} active course(s)`);

    for (const course of courses) {
      await backfillCourse(course);
    }

    console.log('\nMigration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

runMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});

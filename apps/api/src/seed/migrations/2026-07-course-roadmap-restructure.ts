// One-time migration for the Course/Roadmap restructure — see
// docs/content/course-roadmap-restructure-design.md for the full rationale.
//
// This establishes the seed/migrations/ convention: a one-off, non-idempotent-seeder script
// for schema-restructure changes against real data, run manually and once (NOT wired into
// `pnpm seed`). Usage: pnpm --filter api migrate:course-roadmap-restructure
//
// IMPORTANT — before running against the real Atlas database: back up the `roadmaps`,
// `miniapps`, `topics`, and `courses` collections (or run against a copied/staging database
// first). Every id touched is logged below so the run is traceable if something needs undoing.
//
// What this does (see the design doc's "Migration for existing data" section):
//   1. For each of the 3 subjects that already own a real Roadmap (with real nodes and real
//      learner progress via ProfileRoadmapProgress), create a Course pointing roadmapId at
//      that SAME roadmap _id — progress must never be orphaned by recreating roadmaps.
//      The Course also reuses the old roadmap-type MiniApp's _id as its own _id, so every
//      existing Term/Question/Quiz.miniAppId that was scoped to that MiniApp keeps resolving
//      to a real document (now living in the `courses` collection instead of `miniapps`).
//   2. Unsets subjectId/miniAppId on those Roadmap documents (schema no longer has them).
//   3. Deletes the 3 now-superseded roadmap-type MiniApp documents.
//   4. Re-points the "General Dictionary Quiz" from the standalone Vocabulary Quiz MiniApp
//      directly to the Dictionary MiniApp, then deletes the Quiz MiniApp.
//   5. Reparents the surviving Dictionary MiniApp from topicId to subjectId.
//   6. Deletes all documents in the raw `topics` collection (model is gone).
//
// Idempotent-safe: every step checks before writing, so this can be re-run if interrupted
// partway through.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../../config/db';
import Subject from '../../models/core/subject.model';
import Course from '../../models/core/course.model';

interface RoadmapSubjectRow {
  subjectSlug: string;
  oldTopicSlug: string;
  courseSlug: string;
  courseName: string;
}

const ROADMAP_SUBJECT_ROWS: RoadmapSubjectRow[] = [
  { subjectSlug: 'english', oldTopicSlug: 'phonics', courseSlug: 'phonics', courseName: 'Phonics' },
  { subjectSlug: 'isizulu-hl', oldTopicSlug: 'sounds', courseSlug: 'sounds', courseName: 'Sounds' },
  {
    subjectSlug: 'foundation-phase-mathematics',
    oldTopicSlug: 'number-sense',
    courseSlug: 'number-sense',
    courseName: 'Number Sense',
  },
];

async function migrateRoadmapSubject(row: RoadmapSubjectRow, db: mongoose.mongo.Db): Promise<void> {
  console.log(`\nSubject '${row.subjectSlug}':`);

  const subject = await Subject.findOne({ slug: row.subjectSlug });
  if (!subject) {
    console.warn(`  [skip] Subject '${row.subjectSlug}' not found`);
    return;
  }

  let course = await Course.findOne({ subjectId: subject._id, slug: row.courseSlug });

  if (!course) {
    const roadmapDoc = await db.collection('roadmaps').findOne({ subjectId: subject._id });
    if (!roadmapDoc) {
      console.warn(`  [skip] No existing Roadmap found for subject '${row.subjectSlug}' — nothing to migrate`);
      return;
    }

    const topicDoc = await db.collection('topics').findOne({ subjectId: subject._id, slug: row.oldTopicSlug });
    const legacyMiniApp = topicDoc
      ? await db.collection('miniapps').findOne({ topicId: topicDoc._id, slug: 'roadmap' })
      : null;

    course = await Course.create({
      _id: legacyMiniApp ? legacyMiniApp._id : undefined,
      subjectId: subject._id,
      name: row.courseName,
      slug: row.courseSlug,
      roadmapId: roadmapDoc._id,
    });

    console.log(
      `  Created Course '${row.courseSlug}' (_id=${course._id}) -> Roadmap _id=${roadmapDoc._id}` +
        (legacyMiniApp ? ` (reused legacy MiniApp _id=${legacyMiniApp._id})` : ' (fresh _id — no legacy MiniApp found)')
    );
  } else {
    console.log(`  Course '${row.courseSlug}' already exists (_id=${course._id}) — skipping creation`);
  }

  const unsetResult = await db
    .collection('roadmaps')
    .updateOne({ _id: course.roadmapId }, { $unset: { subjectId: '', miniAppId: '' } });
  if (unsetResult.modifiedCount > 0) {
    console.log(`  Unset subjectId/miniAppId on Roadmap _id=${course.roadmapId}`);
  }

  const deleteResult = await db.collection('miniapps').deleteOne({ _id: course._id, type: 'roadmap' });
  if (deleteResult.deletedCount > 0) {
    console.log(`  Deleted legacy roadmap-type MiniApp _id=${course._id}`);
  }
}

// English Vocabulary is not roadmap-linked — handled separately: delete the redundant Quiz
// MiniApp (re-pointing the General Dictionary Quiz at Dictionary first) and reparent Dictionary.
async function migrateVocabularyMiniApps(db: mongoose.mongo.Db): Promise<void> {
  console.log('\nEnglish Vocabulary mini-apps:');

  const englishSubject = await Subject.findOne({ slug: 'english' });
  if (!englishSubject) {
    console.warn('  [skip] English subject not found');
    return;
  }

  const quizMiniApp = await db.collection('miniapps').findOne({ slug: 'quiz', type: 'quiz' });
  const dictionaryMiniApp = await db.collection('miniapps').findOne({ slug: 'dictionary' });

  if (quizMiniApp && dictionaryMiniApp) {
    const quizUpdateResult = await db
      .collection('quizzes')
      .updateMany({ miniAppId: quizMiniApp._id }, { $set: { miniAppId: dictionaryMiniApp._id } });
    if (quizUpdateResult.modifiedCount > 0) {
      console.log(
        `  Re-pointed ${quizUpdateResult.modifiedCount} Quiz doc(s) from legacy Quiz MiniApp _id=${quizMiniApp._id} -> Dictionary MiniApp _id=${dictionaryMiniApp._id}`
      );
    }
  }

  if (quizMiniApp) {
    await db.collection('miniapps').deleteOne({ _id: quizMiniApp._id });
    console.log(`  Deleted legacy Vocabulary Quiz-type MiniApp _id=${quizMiniApp._id}`);
  } else {
    console.log('  Legacy Vocabulary Quiz-type MiniApp already gone — skipping');
  }

  if (dictionaryMiniApp) {
    await db.collection('miniapps').updateOne(
      { _id: dictionaryMiniApp._id },
      { $set: { subjectId: englishSubject._id }, $unset: { topicId: '' } }
    );
    console.log(`  Reparented Dictionary MiniApp _id=${dictionaryMiniApp._id} -> subjectId=${englishSubject._id}`);
  } else {
    console.warn('  [warn] Dictionary MiniApp not found — nothing to reparent');
  }
}

async function runMigration(): Promise<void> {
  await connectDB();

  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error('No active MongoDB connection');

    for (const row of ROADMAP_SUBJECT_ROWS) {
      await migrateRoadmapSubject(row, db);
    }

    await migrateVocabularyMiniApps(db);

    const topicsDeleteResult = await db.collection('topics').deleteMany({});
    console.log(`\nDeleted ${topicsDeleteResult.deletedCount} document(s) from the raw 'topics' collection`);

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

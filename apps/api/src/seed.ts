// Seed script — creates the base content hierarchy needed before the vocab mini-app can be used.
// Run with: pnpm --filter @my-backpack/api seed
//
// Creates (idempotent — skips if already exists):
//   Subject  { name: "Language",   slug: "language" }
//   Topic    { name: "English",    slug: "english",    subjectId: language._id }
//   MiniApp  { name: "Vocabulary", slug: "vocabulary", topicId: english._id }
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import Subject from './models/core/subject.model';
import Topic from './models/core/topic.model';
import MiniApp from './models/core/miniApp.model';

async function seed(): Promise<void> {
  await connectDB();

  // Subject
  let subject = await Subject.findOne({ slug: 'language' });
  if (!subject) {
    subject = await Subject.create({
      name: 'Language',
      slug: 'language',
      description: 'Language learning — vocabulary, grammar, reading, and writing.',
    });
    console.log('Created subject: Language');
  } else {
    console.log('Subject "Language" already exists — skipping');
  }

  // Topic
  let topic = await Topic.findOne({ subjectId: subject._id, slug: 'english' });
  if (!topic) {
    topic = await Topic.create({
      subjectId: subject._id,
      name: 'English',
      slug: 'english',
      description: 'English language skills.',
    });
    console.log('Created topic: English');
  } else {
    console.log('Topic "English" already exists — skipping');
  }

  // MiniApp
  let miniApp = await MiniApp.findOne({ topicId: topic._id, slug: 'vocabulary' });
  if (!miniApp) {
    miniApp = await MiniApp.create({
      topicId: topic._id,
      name: 'Vocabulary',
      slug: 'vocabulary',
      description: 'Build your English vocabulary with spaced repetition and adaptive quizzes.',
    });
    console.log('Created mini-app: Vocabulary');
  } else {
    console.log('MiniApp "Vocabulary" already exists — skipping');
  }

  console.log('\nSeed complete.');
  console.log(`  Subject  _id: ${subject._id.toString()}`);
  console.log(`  Topic    _id: ${topic._id.toString()}`);
  console.log(`  MiniApp  _id: ${miniApp._id.toString()}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

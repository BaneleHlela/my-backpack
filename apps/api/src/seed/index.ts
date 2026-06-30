// Master seed runner. Idempotent — running multiple times updates existing records via
// findOneAndUpdate + upsert instead of creating duplicates. Usage: pnpm --filter api seed
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { seedAccountsAndProfiles } from './seeders/accounts.seed';
import { seedContentHierarchy } from './seeders/content.seed';
import { seedIsiZuluRoadmap } from './seeders/roadmaps/isizulu-hl.roadmap.seed';
import { seedMathFoundationRoadmap } from './seeders/roadmaps/math-foundation.roadmap.seed';
import { seedAllQuestions } from './questions';

async function runSeed(): Promise<void> {
  await connectDB();

  try {
    await seedAccountsAndProfiles();
    console.log('');

    const { miniAppMap } = await seedContentHierarchy();
    console.log('');

    const isizuluRoadmapResult = await seedIsiZuluRoadmap();
    console.log('');

    await seedMathFoundationRoadmap();
    console.log('');

    const dictionaryMiniAppId = miniAppMap.get('english/vocabulary/dictionary');
    if (!dictionaryMiniAppId) throw new Error('Dictionary miniApp not found in map');

    await seedAllQuestions({
      practiceLessonId: isizuluRoadmapResult.practiceLessonId,
      dictionaryMiniAppId,
    });
    console.log('');

    console.log('Seed complete!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});

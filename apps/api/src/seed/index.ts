// Master seed runner. Idempotent — running multiple times updates existing records via
// findOneAndUpdate + upsert instead of creating duplicates. Usage: pnpm --filter api seed
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import Term from '../models/apps/language/vocabulary/term.model';
import { seedAccountsAndProfiles } from './seeders/accounts.seed';
import { seedContentHierarchy } from './seeders/content.seed';
import { seedGeneralDictionaryQuiz } from './seeders/quizzes.seed';
import { seedIsiZuluRoadmap } from './seeders/roadmaps/isizulu-hl.roadmap.seed';
import { seedMathFoundationRoadmap } from './seeders/roadmaps/math-foundation.roadmap.seed';
import { seedEnglishPhonicsRoadmap } from './seeders/roadmaps/english-phonics.roadmap.seed';
import { seedAllQuestions } from './questions';

async function runSeed(): Promise<void> {
  await connectDB();

  try {
    // One-off migration: Term.word used to be globally unique; it's now unique per miniAppId
    // so the same word (e.g. vowel letters) can exist across multiple mini-apps. Dropping the
    // stale single-field index is a no-op once it's already gone, so this is safe to leave here.
    await Term.collection.dropIndex('word_1').catch(() => {});
    await Term.syncIndexes();

    await seedAccountsAndProfiles();
    console.log('');

    const { miniAppMap } = await seedContentHierarchy();
    console.log('');

    const dictionaryMiniAppId = miniAppMap.get('english/vocabulary/dictionary');
    if (!dictionaryMiniAppId) throw new Error('Dictionary miniApp not found in map');
    const quizMiniAppId = miniAppMap.get('english/vocabulary/quiz');
    if (!quizMiniAppId) throw new Error('Quiz miniApp not found in map');

    await seedGeneralDictionaryQuiz(quizMiniAppId, dictionaryMiniAppId);
    console.log('');

    const isizuluRoadmapResult = await seedIsiZuluRoadmap();
    console.log('');

    const mathRoadmapResult = await seedMathFoundationRoadmap();
    console.log('');

    const englishPhonicsResult = await seedEnglishPhonicsRoadmap();
    console.log('');

    await seedAllQuestions({
      vowelsNodeId: isizuluRoadmapResult.vowelsNodeId,
      vowelsIntroLessonId: isizuluRoadmapResult.vowelsIntroLessonId,
      dictionaryMiniAppId,
      consonantsNodeId: isizuluRoadmapResult.consonantsNodeId,
      consonantsIntroLessonId: isizuluRoadmapResult.consonantsIntroLessonId,
      dragNodeId: mathRoadmapResult.dragNodeId,
      dragIntroLessonId: mathRoadmapResult.dragIntroLessonId,
      countingNodeId: mathRoadmapResult.countingNodeId,
      countingIntroLessonId: mathRoadmapResult.countingIntroLessonId,
      englishVowelsNodeId: englishPhonicsResult.vowelsNodeId,
      englishVowelsIntroLessonId: englishPhonicsResult.vowelsIntroLessonId,
      cvcNodeId: englishPhonicsResult.cvcNodeId,
      cvcIntroLessonId: englishPhonicsResult.cvcIntroLessonId,
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

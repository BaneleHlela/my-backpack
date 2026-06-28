// Deletes all AI- and auto-generated questions and resets term aiGenerationStatus to 'pending'.
// Run this after updating the question generation prompt to clear stale questions.
// Usage: pnpm --filter api cleanup-questions
import 'dotenv/config';
import { connectDB } from '../config/db';
import Question from '../models/apps/language/vocabulary/question.model';
import Term from '../models/apps/language/vocabulary/term.model';
import mongoose from 'mongoose';

async function main(): Promise<void> {
  await connectDB();

  const deleteResult = await Question.deleteMany({ source: { $in: ['ai', 'auto'] } });
  console.log(`Deleted ${deleteResult.deletedCount} questions (source: ai or auto).`);

  const updateResult = await Term.updateMany(
    {},
    { $set: { aiGenerationStatus: 'pending', aiGenerationError: undefined } }
  );
  console.log(`Reset aiGenerationStatus to 'pending' on ${updateResult.modifiedCount} terms.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});

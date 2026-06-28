// CLI script to manually trigger question generation for a single term+definition.
// Usage: pnpm --filter api generate-questions -- --termId=xxx --definitionId=xxx
import 'dotenv/config';
import { connectDB } from '../config/db';
import { generateQuestionsForDefinition } from '../services/questionGeneration/index';
import mongoose from 'mongoose';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const termIdArg = args.find((a) => a.startsWith('--termId='));
  const defIdArg = args.find((a) => a.startsWith('--definitionId='));

  if (!termIdArg || !defIdArg) {
    console.error('Usage: ts-node generateQuestions.ts --termId=<id> --definitionId=<id>');
    process.exit(1);
  }

  const termId = termIdArg.split('=')[1];
  const definitionId = defIdArg.split('=')[1];

  await connectDB();
  console.log(`Generating questions for term=${termId} definition=${definitionId}`);

  try {
    await generateQuestionsForDefinition(termId, definitionId);
    console.log('Done.');
  } catch (err) {
    console.error('Generation failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();

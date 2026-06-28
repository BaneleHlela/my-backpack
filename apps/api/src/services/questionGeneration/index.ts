// Orchestrates the full question generation pipeline for a single term+definition pair.
// Fetches distractors, runs non-AI generation, optionally calls the AI generator,
// validates results, and saves all valid questions in one insertMany call.
// Called from admin routes; NOT triggered on bucket add.
import Question from '../../models/apps/language/vocabulary/question.model';
import Term from '../../models/apps/language/vocabulary/term.model';
import Definition from '../../models/apps/language/vocabulary/definition.model';
import { AppError } from '../../utils/AppError';
import { fetchDefinitionDistractors, fetchTermDistractors } from './distractorHelper';
import { generateNonAiQuestions, GeneratedQuestion } from './nonAiGenerator';
import { generateAiQuestions } from './aiGenerator';
import { validateQuestion } from './questionValidator';

export async function generateQuestionsForDefinition(
  termId: string,
  definitionId: string
): Promise<void> {
  // Skip if questions already exist for this term+definition
  const existingCount = await Question.countDocuments({ termId, definitionId, isActive: true });
  if (existingCount > 0) {
    console.log(`Questions already exist for term ${termId} def ${definitionId}, skipping`);
    return;
  }

  const [term, definition] = await Promise.all([
    Term.findById(termId),
    Definition.findById(definitionId),
  ]);
  if (!term || !definition) throw new AppError('Term or definition not found', 404);

  await Term.findByIdAndUpdate(termId, {
    aiGenerationStatus: 'pending',
    $inc: { aiGenerationAttempts: 1 },
  });

  try {
    const [distractorDefs, distractorTerms] = await Promise.all([
      fetchDefinitionDistractors(termId, term.miniAppId.toString(), 3),
      fetchTermDistractors(termId, term.miniAppId.toString(), 3),
    ]);

    const nonAiResults = generateNonAiQuestions(term, definition, distractorDefs, distractorTerms);

    const needsSentence = nonAiResults.some((q) => q.needsAiSentence);
    const aiEnabled = process.env.AI_QUESTION_GENERATION_ENABLED === 'true';

    let aiQuestions: GeneratedQuestion[] = [];
    if (aiEnabled) {
      try {
        aiQuestions = await generateAiQuestions(term, definition, needsSentence, distractorTerms);
      } catch (aiError) {
        console.error(`AI question generation failed for term "${term.word}":`, aiError);
        await Term.findByIdAndUpdate(termId, {
          aiGenerationStatus: 'failed',
          aiGenerationError:
            aiError instanceof Error ? aiError.message : 'Unknown AI error',
        });
        // Continue — non-AI questions are still saved
      }
    }

    // Combine: drop needsAiSentence placeholders (AI fills them if enabled)
    const allQuestions: GeneratedQuestion[] = [
      ...nonAiResults.filter((q) => !q.needsAiSentence),
      ...aiQuestions,
    ];

    const validQuestions = allQuestions.filter((q) => {
      const ok = validateQuestion(q);
      if (!ok) {
        console.warn(
          `Invalid question skipped for term "${term.word}":`,
          JSON.stringify(q).substring(0, 100)
        );
      }
      return ok;
    });

    if (validQuestions.length === 0) {
      throw new Error('No valid questions generated');
    }

    const aiQuestionSet = new Set<GeneratedQuestion>(aiQuestions);

    const questionsToSave = validQuestions.map((q) => ({
      ...q,
      termId,
      definitionId,
      miniAppId: term.miniAppId,
      source: q.source ?? (aiQuestionSet.has(q) ? 'ai' : 'auto'),
      isGeneric: true,
      profileId: null,
      isActive: true,
    }));

    await Question.insertMany(questionsToSave);

    await Term.findByIdAndUpdate(termId, {
      aiGenerationStatus: aiQuestions.length > 0 ? 'complete' : 'not_needed',
      aiGeneratedAt: new Date(),
      aiGenerationError: undefined,
    });

    console.log(
      `Generated ${validQuestions.length} questions for term "${term.word}" ` +
        `(${nonAiResults.filter((q) => !q.needsAiSentence).length} auto, ${aiQuestions.length} AI)`
    );
  } catch (error) {
    await Term.findByIdAndUpdate(termId, {
      aiGenerationStatus: 'failed',
      aiGenerationError: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

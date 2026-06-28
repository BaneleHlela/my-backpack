// Admin routes for triggering and monitoring question generation.
// No auth for now — add authentication before exposing to production.
import express, { Request, Response } from 'express';
import { Router } from 'express';
import { generateQuestionsForDefinition } from '../../services/questionGeneration/index';
import Term from '../../models/apps/language/vocabulary/term.model';
import { Types } from 'mongoose';

const adminRouter: ReturnType<typeof express.Router> = Router();

// POST /api/admin/generate-questions
// Body: { termId: string, definitionId: string }
adminRouter.post('/generate-questions', async (req: Request, res: Response) => {
  const { termId, definitionId } = req.body as { termId?: string; definitionId?: string };

  if (!termId || !definitionId) {
    res.status(400).json({ success: false, error: 'termId and definitionId are required' });
    return;
  }

  try {
    await generateQuestionsForDefinition(termId, definitionId);
    res.json({ success: true, message: 'Generation complete' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/admin/generation-status?miniAppId=xxx
// Returns counts of terms by aiGenerationStatus plus the failed term details.
adminRouter.get('/generation-status', async (req: Request, res: Response) => {
  const { miniAppId } = req.query as { miniAppId?: string };

  if (!miniAppId) {
    res.status(400).json({ success: false, error: 'miniAppId is required' });
    return;
  }

  try {
    const miniAppObjectId = new Types.ObjectId(miniAppId);

    const [counts, failedTerms] = await Promise.all([
      Term.aggregate<{ _id: string; count: number }>([
        { $match: { miniAppId: miniAppObjectId } },
        { $group: { _id: '$aiGenerationStatus', count: { $sum: 1 } } },
      ]),
      Term.find(
        { miniAppId: miniAppObjectId, aiGenerationStatus: 'failed' },
        { _id: 1, word: 1, aiGenerationError: 1 }
      ).lean(),
    ]);

    const statusMap: Record<string, number> = {
      pending: 0,
      complete: 0,
      failed: 0,
      not_needed: 0,
    };
    for (const row of counts) {
      statusMap[row._id] = row.count;
    }

    res.json({
      pending: statusMap['pending'],
      complete: statusMap['complete'],
      failed: statusMap['failed'],
      not_needed: statusMap['not_needed'],
      failedTerms: failedTerms.map((t) => ({
        _id: t._id.toString(),
        word: t.word,
        aiGenerationError: t.aiGenerationError,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/admin/retry-failed-generation
// Body: { miniAppId: string }
// Retries generation for failed terms with fewer than 3 attempts.
adminRouter.post('/retry-failed-generation', async (req: Request, res: Response) => {
  const { miniAppId } = req.body as { miniAppId?: string };

  if (!miniAppId) {
    res.status(400).json({ success: false, error: 'miniAppId is required' });
    return;
  }

  try {
    const miniAppObjectId = new Types.ObjectId(miniAppId);

    // Find failed terms that still have retry budget
    const failedTerms = await Term.find({
      miniAppId: miniAppObjectId,
      aiGenerationStatus: 'failed',
      aiGenerationAttempts: { $lt: 3 },
    }).lean();

    let retried = 0;
    let succeeded = 0;
    let failedCount = 0;

    for (const term of failedTerms) {
      // We need a definitionId — use the first definition for this term
      const Definition = (await import('../../models/apps/language/vocabulary/definition.model'))
        .default;
      const def = await Definition.findOne({ termId: term._id }).lean();
      if (!def) continue;

      retried++;
      try {
        await generateQuestionsForDefinition(term._id.toString(), def._id.toString());
        succeeded++;
      } catch {
        failedCount++;
      }
    }

    res.json({ retried, succeeded, failed: failedCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default adminRouter;

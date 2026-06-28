// HTTP handlers for roadmap routes. Thin layer — all logic lives in roadmap.service.ts.
import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import {
  getRoadmapWithProgress,
  getNodeWithProgress,
  markStudyMaterialViewed,
  startNodeAssessment,
  completeNodeAssessment,
} from './roadmap.service';

export async function getRoadmapHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const miniAppId = req.params['miniAppId'] as string;
    const result = await getRoadmapWithProgress(miniAppId, profileId);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load roadmap';
    sendError(res, message, 404);
  }
}

export async function getNodeHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const nodeId = req.params['nodeId'] as string;
    const allowedTypes = req.contentPrefs?.allowedQuestionTypes;
    const result = await getNodeWithProgress(nodeId, profileId, allowedTypes);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load node';
    sendError(res, message, 404);
  }
}

export async function markStudyViewedHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const nodeId = req.params['nodeId'] as string;
    const entry = await markStudyMaterialViewed(nodeId, profileId);
    sendSuccess(res, { progress: entry });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update progress';
    sendError(res, message, 400);
  }
}

export async function startAssessmentHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const nodeId = req.params['nodeId'] as string;
    const result = await startNodeAssessment(nodeId, profileId);
    sendSuccess(res, result, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start assessment';
    const status = message === 'Node is locked' || message.includes('attempts') ? 403 : 400;
    sendError(res, message, status);
  }
}

export async function completeAssessmentHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const nodeId = req.params['nodeId'] as string;
    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId) {
      sendError(res, 'sessionId is required', 400);
      return;
    }
    const result = await completeNodeAssessment(nodeId, profileId, sessionId);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to complete assessment';
    sendError(res, message, 400);
  }
}

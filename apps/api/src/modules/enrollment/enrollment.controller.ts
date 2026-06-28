// HTTP handlers for enrollment routes. Thin layer — all logic lives in enrollment.service.ts.
import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import {
  enrollInSubject,
  getEnrolledSubjects,
  getEnrolledSubjectsByField,
  getSubjectProgress,
  unenrollFromSubject,
  getAvailableSubjects,
  touchSubjectAccess,
} from './enrollment.service';

export async function getEnrolledSubjectsHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const result = await getEnrolledSubjects(profileId);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch enrollments';
    sendError(res, message, 400);
  }
}

export async function getAvailableSubjectsHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const fieldSlug = req.query['fieldSlug'] as string | undefined;
    const result = await getAvailableSubjects(profileId, fieldSlug);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch available subjects';
    sendError(res, message, 400);
  }
}

export async function enrollHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const { subjectId } = req.body as { subjectId: string };
    if (!subjectId) {
      sendError(res, 'subjectId is required', 400);
      return;
    }
    const enrollment = await enrollInSubject(profileId, subjectId);
    sendSuccess(res, { enrollment }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to enroll';
    const status = message.includes('Already enrolled') ? 409 : 400;
    sendError(res, message, status);
  }
}

export async function unenrollHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const { subjectId } = req.params as { subjectId: string };
    const enrollment = await unenrollFromSubject(profileId, subjectId);
    sendSuccess(res, { enrollment });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to unenroll';
    sendError(res, message, 400);
  }
}

export async function getSubjectProgressHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const { subjectId } = req.params as { subjectId: string };
    const result = await getSubjectProgress(profileId, subjectId);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch subject progress';
    sendError(res, message, 404);
  }
}

export async function getEnrolledSubjectsByFieldHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const { fieldSlug } = req.params as { fieldSlug: string };
    const result = await getEnrolledSubjectsByField(profileId, fieldSlug);
    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch enrollments for field';
    sendError(res, message, 400);
  }
}

export async function touchAccessHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileId = req.profile!._id.toString();
    const { subjectId } = req.params as { subjectId: string };
    await touchSubjectAccess(profileId, subjectId);
    sendSuccess(res, { ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update access time';
    sendError(res, message, 400);
  }
}

// Express middleware for JWT-based auth: requireAccount, requireProfile, requireOwner
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, FullTokenPayload } from '../../utils/jwt';
import Account from '../../models/core/account.model';
import Profile from '../../models/core/profile.model';
import { sendError } from '../../utils/response';

export async function requireAccount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'No token provided', 401);
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    const account = await Account.findById(payload.accountId);
    if (!account) {
      sendError(res, 'Account not found', 401);
      return;
    }
    req.account = account;
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
}

export async function requireProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'No token provided', 401);
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token) as FullTokenPayload;
    if (!payload.profileId) {
      sendError(res, 'Profile not selected — use /auth/select-profile first', 403);
      return;
    }

    const account = await Account.findById(payload.accountId);
    if (!account) {
      sendError(res, 'Account not found', 401);
      return;
    }

    const profile = await Profile.findById(payload.profileId);
    if (!profile) {
      sendError(res, 'Profile not found', 401);
      return;
    }

    req.account = account;
    req.profile = profile;
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
}

export function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.profile?.isOwner) {
    sendError(res, 'Owner profile required', 403);
    return;
  }
  next();
}

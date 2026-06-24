// Profile-specific middleware: validates that req.params.profileId belongs to the authenticated account.
// Guards /:profileId routes against cross-account operations before the service is called.
import { Request, Response, NextFunction } from 'express';
import Profile from '../../models/core/profile.model';
import { sendError } from '../../utils/response';

export async function requireTargetProfileBelongsToAccount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const profileId = req.params['profileId'] as string;
  if (!req.account) {
    sendError(res, 'Unauthorized', 401);
    return;
  }
  try {
    const exists = await Profile.exists({ _id: profileId, accountId: req.account._id });
    if (!exists) {
      sendError(res, 'Profile not found', 404);
      return;
    }
    next();
  } catch {
    sendError(res, 'Failed to validate profile', 500);
  }
}

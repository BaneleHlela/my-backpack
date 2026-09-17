import { Request, Response } from 'express';
import { AppError, catchAsync } from '../../utils/AppError';
import { sendSuccess } from '../../utils/response';
import { getXpSummary } from './xp.service';

export const getXpSummaryHandler = catchAsync(async (req: Request, res: Response) => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);
  sendSuccess(res, await getXpSummary(profileId));
});

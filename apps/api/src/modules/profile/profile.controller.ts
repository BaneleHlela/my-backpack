// Route handlers for profile endpoints — delegates to profile.service
import { Request, Response } from 'express';
import {
  getProfileById,
  getProfilesByAccountId,
  createProfile,
  updateProfile,
  completeProfileSetup,
  deleteProfile,
  setPin,
  removePin,
  getProfileStats,
} from './profile.service';
import { sendSuccess } from '../../utils/response';
import { AppError, catchAsync } from '../../utils/AppError';
import { CreateProfileDto, UpdateProfileDto, ProfileSetupDto } from './profile.types';

export const listProfiles = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const accountId = req.account?._id.toString();
  if (!accountId) throw new AppError('Unauthorized', 401);

  try {
    const profiles = await getProfilesByAccountId(accountId);
    sendSuccess(res, profiles);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to fetch profiles', 500);
  }
});

export const createProfileHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const accountId = req.account?._id.toString();
  if (!accountId) throw new AppError('Unauthorized', 401);

  const { displayName, ageGroup, dateOfBirth } = req.body as CreateProfileDto;
  if (!displayName || !ageGroup) throw new AppError('displayName and ageGroup are required', 400);

  try {
    const profile = await createProfile(accountId, { displayName, ageGroup, dateOfBirth });
    sendSuccess(res, profile, 201);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to create profile', 400);
  }
});

export const getMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  try {
    const profile = await getProfileById(profileId);
    sendSuccess(res, profile);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to fetch profile', 500);
  }
});

export const updateMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  try {
    const data = req.body as UpdateProfileDto;
    const profile = await updateProfile(profileId, data);
    sendSuccess(res, profile);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to update profile', 400);
  }
});

export const setupMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.profile?._id.toString();
  if (!profileId) throw new AppError('Unauthorized', 401);

  const data = req.body as ProfileSetupDto;
  if (!data.dateOfBirth || !data.education?.currentLevel) {
    throw new AppError('dateOfBirth and education.currentLevel are required', 400);
  }

  try {
    const profile = await completeProfileSetup(profileId, data);
    sendSuccess(res, profile);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to complete setup', 400);
  }
});

export const deleteProfileHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const accountId = req.account?._id.toString();
  const profileId = req.params['profileId'] as string;

  if (!accountId) throw new AppError('Unauthorized', 401);

  try {
    await deleteProfile(profileId, accountId);
    sendSuccess(res, { message: 'Profile deleted' });
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to delete profile', 400);
  }
});

export const setPinHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.params['profileId'] as string;
  const { pin } = req.body as { pin: string };

  if (!pin) throw new AppError('pin is required', 400);

  try {
    await setPin(profileId, pin);
    sendSuccess(res, { message: 'PIN set successfully' });
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to set PIN', 400);
  }
});

export const removePinHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const profileId = req.params['profileId'] as string;

  try {
    await removePin(profileId);
    sendSuccess(res, { message: 'PIN removed' });
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to remove PIN', 500);
  }
});

export const getProfileStatsHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const profileId = req.profile?._id.toString();
    if (!profileId) throw new AppError('Unauthorized', 401);

    try {
      const stats = await getProfileStats(profileId);
      sendSuccess(res, stats);
    } catch (err) {
      throw new AppError(err instanceof Error ? err.message : 'Failed to fetch profile stats', 500);
    }
  }
);

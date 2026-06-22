// Profile management routes — scaffolded, controllers to be implemented per mini-app needs
import { Router, IRouter, Request, Response } from 'express';
import { requireProfile, requireOwner } from '../auth/auth.middleware';
import Profile from '../../models/profile.model';
import Account from '../../models/account.model';
import { sendSuccess, sendError } from '../../utils/response';

const router: IRouter = Router();

const MAX_PROFILES = parseInt(process.env.MAX_PROFILES_PER_ACCOUNT ?? '6', 10);

// GET /api/profiles — list all profiles for the authenticated account
router.get('/', requireProfile, async (req: Request, res: Response): Promise<void> => {
  try {
    const profiles = await Profile.find({ accountId: req.account!._id });
    sendSuccess(res, profiles);
  } catch {
    sendError(res, 'Failed to fetch profiles', 500);
  }
});

// POST /api/profiles — create a new profile (owner only, max 6)
router.post('/', requireProfile, requireOwner, async (req: Request, res: Response): Promise<void> => {
  try {
    const account = req.account!;
    if (account.profiles.length >= MAX_PROFILES) {
      sendError(res, `Maximum of ${MAX_PROFILES} profiles allowed per account`);
      return;
    }

    const { displayName, ageGroup, avatarUrl, dateOfBirth } = req.body as {
      displayName: string;
      ageGroup: 'child' | 'teen' | 'adult';
      avatarUrl?: string;
      dateOfBirth?: string;
    };

    if (!displayName || !ageGroup) {
      sendError(res, 'displayName and ageGroup are required');
      return;
    }

    const profile = new Profile({
      accountId: account._id,
      displayName,
      ageGroup,
      avatarUrl,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      isOwner: false,
    });
    await profile.save();

    account.profiles.push(profile._id);
    await account.save();

    sendSuccess(res, profile, 201);
  } catch {
    sendError(res, 'Failed to create profile', 500);
  }
});

// PATCH /api/profiles/:profileId — update a profile (owner only)
router.patch('/:profileId', requireProfile, requireOwner, async (req: Request, res: Response): Promise<void> => {
  try {
    const { profileId } = req.params;
    const updates = req.body as Partial<{
      displayName: string;
      avatarUrl: string;
      dateOfBirth: string;
      ageGroup: 'child' | 'teen' | 'adult';
      'preferences.language': string;
      'preferences.theme': 'light' | 'dark';
    }>;

    const profile = await Profile.findOneAndUpdate(
      { _id: profileId, accountId: req.account!._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!profile) {
      sendError(res, 'Profile not found', 404);
      return;
    }
    sendSuccess(res, profile);
  } catch {
    sendError(res, 'Failed to update profile', 500);
  }
});

// DELETE /api/profiles/:profileId — delete a profile (owner only, cannot delete owner profile)
router.delete('/:profileId', requireProfile, requireOwner, async (req: Request, res: Response): Promise<void> => {
  try {
    const { profileId } = req.params;
    const profile = await Profile.findOne({ _id: profileId, accountId: req.account!._id });

    if (!profile) {
      sendError(res, 'Profile not found', 404);
      return;
    }
    if (profile.isOwner) {
      sendError(res, 'Cannot delete the owner profile', 403);
      return;
    }

    await profile.deleteOne();
    await Account.findByIdAndUpdate(req.account!._id, {
      $pull: { profiles: profile._id },
    });

    sendSuccess(res, { message: 'Profile deleted' });
  } catch {
    sendError(res, 'Failed to delete profile', 500);
  }
});

// POST /api/profiles/:profileId/pin — set or update PIN on a profile
router.post('/:profileId/pin', requireProfile, requireOwner, async (req: Request, res: Response): Promise<void> => {
  try {
    const { profileId } = req.params;
    const { pin } = req.body as { pin: string };

    if (!pin || !/^\d{4}$/.test(pin)) {
      sendError(res, 'PIN must be exactly 4 digits');
      return;
    }

    const profile = await Profile.findOne({ _id: profileId, accountId: req.account!._id });
    if (!profile) {
      sendError(res, 'Profile not found', 404);
      return;
    }
    if (profile.isOwner) {
      sendError(res, 'Cannot set a PIN on the owner profile', 403);
      return;
    }

    profile.pin = pin;
    await profile.save();

    sendSuccess(res, { message: 'PIN set successfully' });
  } catch {
    sendError(res, 'Failed to set PIN', 500);
  }
});

// DELETE /api/profiles/:profileId/pin — remove PIN from a profile
router.delete('/:profileId/pin', requireProfile, requireOwner, async (req: Request, res: Response): Promise<void> => {
  try {
    const { profileId } = req.params;
    const profile = await Profile.findOne({ _id: profileId, accountId: req.account!._id });

    if (!profile) {
      sendError(res, 'Profile not found', 404);
      return;
    }

    profile.pin = undefined;
    await profile.save();

    sendSuccess(res, { message: 'PIN removed' });
  } catch {
    sendError(res, 'Failed to remove PIN', 500);
  }
});

export default router;

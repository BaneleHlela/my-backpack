// Profile router — all routes mounted at /api/profiles
import { Router, IRouter } from 'express';
import { requireAccount, requireProfile, requireOwner } from '../auth/auth.middleware';
import { requireTargetProfileBelongsToAccount } from './profile.middleware';
import {
  listProfiles,
  createProfileHandler,
  getMe,
  updateMe,
  setupMe,
  deleteProfileHandler,
  setPinHandler,
  removePinHandler,
  getProfileStatsHandler,
} from './profile.controller';

const router: IRouter = Router();

// Account-level routes — partial token (no profile selected) is sufficient
router.get('/', requireAccount, listProfiles);

// Owner-only account-level route — full token required so requireOwner can read req.profile
router.post('/', requireProfile, requireOwner, createProfileHandler);

// Active-profile routes — full token required
router.get('/me', requireProfile, getMe);
router.get('/me/stats', requireProfile, getProfileStatsHandler);
router.patch('/me', requireProfile, updateMe);
router.patch('/me/setup', requireProfile, setupMe);

// Target-profile routes — owner only; also validates profileId belongs to this account
router.delete(
  '/:profileId',
  requireProfile,
  requireOwner,
  requireTargetProfileBelongsToAccount,
  deleteProfileHandler
);
router.post(
  '/:profileId/pin',
  requireProfile,
  requireOwner,
  requireTargetProfileBelongsToAccount,
  setPinHandler
);
router.delete(
  '/:profileId/pin',
  requireProfile,
  requireOwner,
  requireTargetProfileBelongsToAccount,
  removePinHandler
);

export default router;

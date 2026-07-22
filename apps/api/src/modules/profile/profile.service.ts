// Business logic for profile management: CRUD, setup, PIN operations
import { Types } from 'mongoose';
import Account from '../../models/core/account.model';
import Profile, { IProfileDocument } from '../../models/core/profile.model';
import BucketEntry from '../../models/apps/language/vocabulary/bucketEntry.model';
import LearningRecord from '../../models/learning/learningRecord.model';
import AdaptiveProfile from '../../models/learning/adaptiveProfile.model';
import QuizSession from '../../models/learning/quizSession.model';
import {
  ProfileSummary,
  CreateProfileDto,
  UpdateProfileDto,
  ProfileSetupDto,
} from './profile.types';

const MAX_PROFILES = 6;

function toProfileSummary(profile: IProfileDocument): ProfileSummary {
  return {
    id: profile._id.toString(),
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    ageGroup: profile.ageGroup,
    isOwner: profile.isOwner,
    isSetupComplete: profile.isSetupComplete,
    hasPin: !!profile.pin,
  };
}

export async function getProfileById(profileId: string): Promise<IProfileDocument> {
  const profile = await Profile.findById(profileId).select('-pin');
  if (!profile) throw new Error('Profile not found');
  return profile;
}

export async function getProfilesByAccountId(accountId: string): Promise<ProfileSummary[]> {
  const account = await Account.findById(accountId);
  if (!account) throw new Error('Account not found');
  const profiles = await Profile.find({ _id: { $in: account.profiles } });
  return profiles.map(toProfileSummary);
}

export async function createProfile(
  accountId: string,
  data: CreateProfileDto
): Promise<IProfileDocument> {
  const account = await Account.findById(accountId);
  if (!account) throw new Error('Account not found');

  if (account.profiles.length >= MAX_PROFILES) {
    throw new Error(`Maximum of ${MAX_PROFILES} profiles allowed per account`);
  }

  const profile = new Profile({
    accountId: account._id,
    displayName: data.displayName,
    ageGroup: data.ageGroup,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    isOwner: false,
  });
  await profile.save();

  account.profiles.push(profile._id);
  await account.save();

  return profile;
}

export async function updateProfile(
  profileId: string,
  data: UpdateProfileDto
): Promise<IProfileDocument> {
  const updates: Record<string, unknown> = {};
  if (data.displayName !== undefined) updates['displayName'] = data.displayName;
  if (data.avatarUrl !== undefined) updates['avatarUrl'] = data.avatarUrl;
  if (data.dateOfBirth !== undefined) updates['dateOfBirth'] = new Date(data.dateOfBirth);
  if (data.preferences?.language !== undefined) updates['preferences.language'] = data.preferences.language;
  if (data.preferences?.theme !== undefined) updates['preferences.theme'] = data.preferences.theme;

  const profile = await Profile.findByIdAndUpdate(
    profileId,
    { $set: updates },
    { new: true, runValidators: true, select: '-pin' }
  );
  if (!profile) throw new Error('Profile not found');
  return profile;
}

export async function completeProfileSetup(
  profileId: string,
  data: ProfileSetupDto
): Promise<IProfileDocument> {
  if (!data.dateOfBirth) throw new Error('dateOfBirth is required');
  if (!data.education?.currentLevel) throw new Error('education.currentLevel is required');

  const setFields: Record<string, unknown> = {
    dateOfBirth: new Date(data.dateOfBirth),
    'education.currentLevel': data.education.currentLevel,
    isSetupComplete: true,
  };

  if (data.education.institution !== undefined) {
    setFields['education.institution'] = data.education.institution;
  }
  if (data.preferences?.language !== undefined) {
    setFields['preferences.language'] = data.preferences.language;
  }
  if (data.preferences?.theme !== undefined) {
    setFields['preferences.theme'] = data.preferences.theme;
  }

  const profile = await Profile.findByIdAndUpdate(
    profileId,
    { $set: setFields },
    { new: true, runValidators: true, select: '-pin' }
  );
  if (!profile) throw new Error('Profile not found');
  return profile;
}

export async function deleteProfile(profileId: string, accountId: string): Promise<void> {
  const profile = await Profile.findOne({ _id: profileId, accountId });
  if (!profile) throw new Error('Profile not found');
  if (profile.isOwner) throw new Error('Cannot delete the owner profile');

  await profile.deleteOne();
  await Account.findByIdAndUpdate(accountId, { $pull: { profiles: profile._id } });
}

export async function setPin(profileId: string, pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits');

  const profile = await Profile.findById(profileId);
  if (!profile) throw new Error('Profile not found');
  if (profile.isOwner) throw new Error('Cannot set a PIN on the owner profile');

  profile.pin = pin;
  await profile.save();
}

export async function removePin(profileId: string): Promise<void> {
  const profile = await Profile.findById(profileId);
  if (!profile) throw new Error('Profile not found');

  profile.pin = undefined;
  await profile.save();
}

export interface RecentSession {
  _id: Types.ObjectId;
  miniAppId: Types.ObjectId;
  miniAppName: string;
  percentageScore: number;
  completedAt: Date;
  totalQuestions: number;
}

export interface ProfileStats {
  totalTermsInBucket: number;
  totalLearning: number;
  totalMastered: number;
  totalReviewing: number;
  overallAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  lastStudiedAt: Date | null;
  recentSessions: RecentSession[];
}

export async function getProfileStats(profileId: string): Promise<ProfileStats> {
  const [
    totalTermsInBucket,
    totalLearning,
    totalMastered,
    totalReviewing,
    adaptiveProfile,
    recentSessionDocs,
  ] = await Promise.all([
    BucketEntry.countDocuments({ profileId }),
    LearningRecord.countDocuments({ profileId, status: 'learning' }),
    LearningRecord.countDocuments({ profileId, status: 'mastered' }),
    LearningRecord.countDocuments({ profileId, status: 'reviewing' }),
    AdaptiveProfile.findOne({ profileId }),
    QuizSession.find({ profileId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(5)
      .populate<{ miniAppId: { _id: Types.ObjectId; name: string } }>('miniAppId', 'name'),
  ]);

  const globalStats = adaptiveProfile?.globalStats;

  // Roadmap-linked quiz sessions carry a Course _id in miniAppId (not a MiniApp document), so
  // populate resolves to null for those — filter them out rather than surface a broken name.
  const recentSessions: RecentSession[] = recentSessionDocs
    .filter((s) => s.miniAppId != null)
    .map((s) => ({
      _id: s._id as Types.ObjectId,
      miniAppId: s.miniAppId._id,
      miniAppName: s.miniAppId.name,
      percentageScore: s.results?.percentageScore ?? 0,
      completedAt: s.completedAt!,
      totalQuestions: s.results?.totalQuestions ?? 0,
    }));

  return {
    totalTermsInBucket,
    totalLearning,
    totalMastered,
    totalReviewing,
    overallAccuracy: globalStats?.overallAccuracy ?? 0,
    currentStreak: globalStats?.currentStreak ?? 0,
    longestStreak: globalStats?.longestStreak ?? 0,
    lastStudiedAt: globalStats?.lastStudiedAt ?? null,
    recentSessions,
  };
}

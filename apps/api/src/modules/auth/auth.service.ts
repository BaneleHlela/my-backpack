// Business logic for auth: register, login, profile selection, token refresh, OAuth upsert
import Account, { IAccountDocument } from '../../models/account.model';
import Profile, { IProfileDocument, AgeGroup } from '../../models/profile.model';
import {
  signPartialToken,
  signFullToken,
  signRefreshToken,
  verifyRefreshToken,
  FullTokenPayload,
} from '../../utils/jwt';

export interface ProfileSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
  ageGroup: AgeGroup;
  isOwner: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  ageGroup: AgeGroup;
}

export interface RegisterResult {
  accessToken: string;
  refreshToken: string;
  profile: ProfileSummary;
}

export interface LoginResult {
  partialToken: string;
  refreshToken: string;
  profiles: ProfileSummary[];
}

export interface SelectProfileResult {
  accessToken: string;
}

function toProfileSummary(profile: IProfileDocument): ProfileSummary {
  return {
    id: profile._id.toString(),
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    ageGroup: profile.ageGroup,
    isOwner: profile.isOwner,
  };
}

export async function registerLocal(input: RegisterInput): Promise<RegisterResult> {
  const existing = await Account.findOne({ email: input.email.toLowerCase() });
  if (existing) throw new Error('An account with this email already exists');

  const account = new Account({
    email: input.email,
    password: input.password,
    authProviders: [{ provider: 'local', providerId: input.email.toLowerCase() }],
  });
  await account.save();

  const profile = new Profile({
    accountId: account._id,
    displayName: input.displayName,
    ageGroup: input.ageGroup,
    isOwner: true,
  });
  await profile.save();

  account.profiles.push(profile._id);
  account.activeProfile = profile._id;
  await account.save();

  const accessToken = signFullToken({
    accountId: account._id.toString(),
    profileId: profile._id.toString(),
    ageGroup: profile.ageGroup,
  });
  const refreshToken = signRefreshToken({ accountId: account._id.toString() });

  return { accessToken, refreshToken, profile: toProfileSummary(profile) };
}

export async function loginLocal(
  email: string,
  password: string
): Promise<LoginResult> {
  const account = await Account.findOne({ email: email.toLowerCase() });
  if (!account) throw new Error('Invalid email or password');

  const valid = await account.comparePassword(password);
  if (!valid) throw new Error('Invalid email or password');

  const profiles = await Profile.find({ _id: { $in: account.profiles } });

  const partialToken = signPartialToken({ accountId: account._id.toString() });
  const refreshToken = signRefreshToken({ accountId: account._id.toString() });

  return {
    partialToken,
    refreshToken,
    profiles: profiles.map(toProfileSummary),
  };
}

export async function selectProfile(
  accountId: string,
  profileId: string,
  pin?: string
): Promise<SelectProfileResult> {
  const account = await Account.findById(accountId);
  if (!account) throw new Error('Account not found');

  const profileBelongs = account.profiles.some((p) => p.toString() === profileId);
  if (!profileBelongs) throw new Error('Profile does not belong to this account');

  const profile = await Profile.findById(profileId);
  if (!profile) throw new Error('Profile not found');

  if (profile.pin) {
    if (!pin) throw new Error('This profile requires a PIN');
    const valid = await profile.comparePin(pin);
    if (!valid) throw new Error('Incorrect PIN');
  }

  account.activeProfile = profile._id;
  await account.save();

  const accessToken = signFullToken({
    accountId,
    profileId,
    ageGroup: profile.ageGroup,
  });

  return { accessToken };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string }> {
  const payload = verifyRefreshToken(refreshToken);

  const account = await Account.findById(payload.accountId);
  if (!account) throw new Error('Account not found');

  // Re-issue preserving the active profile if one is set
  if (account.activeProfile) {
    const profile = await Profile.findById(account.activeProfile);
    if (profile) {
      const accessToken = signFullToken({
        accountId: account._id.toString(),
        profileId: profile._id.toString(),
        ageGroup: profile.ageGroup,
      });
      return { accessToken };
    }
  }

  const accessToken = signPartialToken({ accountId: account._id.toString() });
  return { accessToken };
}

export async function upsertOAuthAccount(
  provider: 'google' | 'facebook',
  providerId: string,
  email: string | undefined,
  displayName: string
): Promise<{ account: IAccountDocument; isNew: boolean }> {
  // Check for existing account with this provider
  let account = await Account.findOne({
    authProviders: { $elemMatch: { provider, providerId } },
  });

  if (account) return { account, isNew: false };

  // Check for existing account with same email
  if (email) {
    account = await Account.findOne({ email: email.toLowerCase() });
    if (account) {
      account.authProviders.push({ provider, providerId });
      await account.save();
      return { account, isNew: false };
    }
  }

  // Create a new account and owner profile
  account = new Account({
    email: email ? email.toLowerCase() : undefined,
    authProviders: [{ provider, providerId }],
    isEmailVerified: !!email,
  });
  await account.save();

  const profile = new Profile({
    accountId: account._id,
    displayName,
    ageGroup: 'adult',
    isOwner: true,
  });
  await profile.save();

  account.profiles.push(profile._id);
  account.activeProfile = profile._id;
  await account.save();

  return { account, isNew: true };
}

export async function getProfilesForAccount(accountId: string): Promise<ProfileSummary[]> {
  const account = await Account.findById(accountId);
  if (!account) throw new Error('Account not found');
  const profiles = await Profile.find({ _id: { $in: account.profiles } });
  return profiles.map(toProfileSummary);
}

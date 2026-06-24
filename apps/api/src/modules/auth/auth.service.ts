// Business logic for auth: register, login, profile selection, token refresh, OAuth upsert
import crypto from 'crypto';
import Account, { IAccountDocument } from '../../models/core/account.model';
import Profile, { IProfileDocument, AgeGroup } from '../../models/core/profile.model';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../../utils/email';
import {
  signPartialToken,
  signFullToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';

export interface ProfileSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
  ageGroup: AgeGroup;
  isOwner: boolean;
  isSetupComplete: boolean;
  hasPin: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  ageGroup: AgeGroup;
}

export class EmailNotVerifiedError extends Error {
  email: string;
  constructor(email: string) {
    super('EMAIL_NOT_VERIFIED');
    this.name = 'EmailNotVerifiedError';
    this.email = email;
  }
}

export interface RegisterResult {
  email: string;
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
    isSetupComplete: profile.isSetupComplete,
    hasPin: !!profile.pin,
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

  const verificationToken = crypto.randomBytes(32).toString('hex');
  account.verificationToken = verificationToken;
  account.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  account.profiles.push(profile._id);
  account.activeProfile = profile._id;
  await account.save();

  const verificationUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
  await sendVerificationEmail(input.email, verificationUrl);

  return { email: input.email };
}

export async function loginLocal(
  email: string,
  password: string
): Promise<LoginResult> {
  const account = await Account.findOne({ email: email.toLowerCase() });
  if (!account) throw new Error('Invalid email or password');
  
  const valid = await account.comparePassword(password);
  if (!valid) throw new Error('Invalid email or password');

  if (!account.isEmailVerified) {
    throw new EmailNotVerifiedError(account.email ?? email);
  }

  const profiles = await Profile.find({ _id: { $in: account.profiles } });
  console.log('loginLocal profiles', profiles.map((p) => p.displayName));

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

export async function sendVerificationCode(accountId: string): Promise<void> {
  const account = await Account.findById(accountId);
  if (!account) throw new Error('Account not found');
  if (!account.email) throw new Error('Account has no email address');
  if (account.isEmailVerified) throw new Error('Email is already verified');

  const token = crypto.randomBytes(32).toString('hex');
  account.verificationToken = token;
  account.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await account.save();

  const verificationUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/auth/verify-email?token=${token}`;
  await sendVerificationEmail(account.email, verificationUrl);
}

export async function verifyEmail(token: string): Promise<void> {
  const account = await Account.findOne({
    verificationToken: token,
    verificationTokenExpiresAt: { $gt: new Date() },
  });

  if (!account) throw new Error('Invalid or expired verification token');

  account.isEmailVerified = true;
  account.verificationToken = undefined;
  account.verificationTokenExpiresAt = undefined;
  await account.save();

  if (account.email) {
    const ownerProfile = await Profile.findOne({ accountId: account._id, isOwner: true });
    // await sendWelcomeEmail(account.email, ownerProfile?.displayName ?? 'there');
  }
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const account = await Account.findOne({ email: email.toLowerCase() });
  if (!account?.email || account.isEmailVerified) return; // silent — avoid enumeration

  const token = crypto.randomBytes(32).toString('hex');
  account.verificationToken = token;
  account.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await account.save();

  const verificationUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/verify-email?token=${token}`;
  await sendVerificationEmail(account.email, verificationUrl);
}

export async function forgotPassword(email: string): Promise<void> {
  const account = await Account.findOne({ email: email.toLowerCase() });
  if (!account?.email) return; // silent — avoid user enumeration

  const token = crypto.randomBytes(32).toString('hex');
  account.passwordResetToken = token;
  account.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await account.save();

  const resetUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/auth/reset-password?token=${token}`;
  await sendPasswordResetEmail(account.email, resetUrl);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const account = await Account.findOne({
    passwordResetToken: token,
    passwordResetExpiresAt: { $gt: new Date() },
  });

  if (!account) throw new Error('Invalid or expired reset token');

  account.password = newPassword; // pre-save hook hashes it
  account.passwordResetToken = undefined;
  account.passwordResetExpiresAt = undefined;
  await account.save();
}

export async function deleteAccount(accountId: string): Promise<void> {
  const account = await Account.findById(accountId);
  if (!account) throw new Error('Account not found');

  await Profile.deleteMany({ _id: { $in: account.profiles } });
  await account.deleteOne();
}

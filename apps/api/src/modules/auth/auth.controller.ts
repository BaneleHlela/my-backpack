// Route handlers for auth endpoints — delegates to auth.service
import { Request, Response } from 'express';
import {
  registerLocal,
  loginLocal,
  selectProfile,
  refreshAccessToken,
  getProfilesForAccount,
  sendVerificationCode,
  verifyEmail,
  forgotPassword,
  resetPassword,
  deleteAccount,
  resendVerificationEmail,
  EmailNotVerifiedError,
} from './auth.service';
import { sendSuccess } from '../../utils/response';
import { AppError, catchAsync } from '../../utils/AppError';
import { signPartialToken } from '../../utils/jwt';
import { IAccountDocument } from '../../models/core/account.model';

const REFRESH_COOKIE = 'refreshToken';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export const register = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { email, password, displayName, ageGroup } = req.body as {
    email: string;
    password: string;
    displayName: string;
    ageGroup: 'child' | 'teen' | 'adult';
  };

  if (!email || !password || !displayName || !ageGroup) {
    throw new AppError('email, password, displayName and ageGroup are required', 400);
  }

  try {
    const result = await registerLocal({ email, password, displayName, ageGroup });
    sendSuccess(res, { email: result.email }, 201);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Registration failed', 400);
  }
});

export const login = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) throw new AppError('email and password are required', 400);

  try {
    const result = await loginLocal(email, password);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { partialToken: result.partialToken, profiles: result.profiles });
  } catch (err) {
    if (err instanceof EmailNotVerifiedError) {
      // Non-standard shape — kept as-is per API contract
      res.status(403).json({ needsVerification: true, email: err.email });
      return;
    }
    throw new AppError(err instanceof Error ? err.message : 'Login failed', 401);
  }
});

export const selectProfileHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { profileId, pin } = req.body as { profileId: string; pin?: string };
  const accountId = req.account?._id.toString();

  if (!accountId) throw new AppError('Unauthorized', 401);
  if (!profileId) throw new AppError('profileId is required', 400);

  try {
    const result = await selectProfile(accountId, profileId, pin);
    sendSuccess(res, { accessToken: result.accessToken });
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Profile selection failed', 403);
  }
});

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict' });
  sendSuccess(res, { message: 'Logged out' });
}

export const refresh = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies[REFRESH_COOKIE] as string | undefined;
  if (!token) throw new AppError('No refresh token', 401);

  try {
    const result = await refreshAccessToken(token);
    sendSuccess(res, { accessToken: result.accessToken });
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
});

export const sendVerificationHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const accountId = req.account?._id.toString();
  if (!accountId) throw new AppError('Unauthorized', 401);

  try {
    await sendVerificationCode(accountId);
    sendSuccess(res, { message: 'Verification code sent' });
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to send verification code', 400);
  }
});

export const verifyEmailHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body as { token: string };
  if (!token) throw new AppError('token is required', 400);

  try {
    await verifyEmail(token);
    sendSuccess(res, { message: 'Email verified successfully' });
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Verification failed', 400);
  }
});

export const forgotPasswordHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email: string };
  if (!email) throw new AppError('email is required', 400);

  try {
    await forgotPassword(email);
    sendSuccess(res, { message: 'If that email exists, a reset link has been sent' });
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Request failed', 400);
  }
});

export const resetPasswordHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body as { token: string; password: string };
  if (!token || !password) throw new AppError('token and password are required', 400);

  try {
    await resetPassword(token, password);
    sendSuccess(res, { message: 'Password reset successfully' });
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Reset failed', 400);
  }
});

export const deleteAccountHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const accountId = req.account?._id.toString();
  if (!accountId) throw new AppError('Unauthorized', 401);

  try {
    await deleteAccount(accountId);
    res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict' });
    sendSuccess(res, { message: 'Account deleted' });
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Delete failed', 400);
  }
});

export const resendVerificationEmailHandler = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email: string };
  if (!email) throw new AppError('email is required', 400);

  try {
    await resendVerificationEmail(email);
    sendSuccess(res, { message: 'If that email exists and is unverified, a verification link has been sent.' });
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to send verification email', 400);
  }
});

// Called after OAuth callback — issues partial token and redirects
export async function handleOAuthCallback(
  account: IAccountDocument,
  res: Response
): Promise<void> {
  const profiles = await getProfilesForAccount(account._id.toString());
  const partialToken = signPartialToken({ accountId: account._id.toString() });
  const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
  // Redirect with token as query param; client exchanges it for full session
  res.redirect(
    `${clientUrl}/auth/callback?token=${partialToken}&profileCount=${profiles.length}`
  );
}

// Route handlers for auth endpoints — delegates to auth.service
import { Request, Response } from 'express';
import {
  registerLocal,
  loginLocal,
  selectProfile,
  refreshAccessToken,
  upsertOAuthAccount,
  getProfilesForAccount,
  sendVerificationCode,
  verifyEmail,
  forgotPassword,
  resetPassword,
  deleteAccount,
  resendVerificationEmail,
  EmailNotVerifiedError,
} from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { signPartialToken } from '../../utils/jwt';
import { IAccountDocument } from '../../models/account.model';

const REFRESH_COOKIE = 'refreshToken';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, displayName, ageGroup } = req.body as {
    email: string;
    password: string;
    displayName: string;
    ageGroup: 'child' | 'teen' | 'adult';
  };

  if (!email || !password || !displayName || !ageGroup) {
    sendError(res, 'email, password, displayName and ageGroup are required');
    return;
  }

  try {
    const result = await registerLocal({ email, password, displayName, ageGroup });
    sendSuccess(res, { email: result.email }, 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Registration failed');
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    sendError(res, 'email and password are required');
    return;
  }

  try {
    const result = await loginLocal(email, password);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { partialToken: result.partialToken, profiles: result.profiles });
  } catch (err) {
    if (err instanceof EmailNotVerifiedError) {
      res.status(403).json({ needsVerification: true, email: err.email });
      return;
    }
    sendError(res, err instanceof Error ? err.message : 'Login failed', 401);
  }
}

export async function selectProfileHandler(req: Request, res: Response): Promise<void> {
  const { profileId, pin } = req.body as { profileId: string; pin?: string };
  const accountId = req.account?._id.toString();

  if (!accountId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }
  if (!profileId) {
    sendError(res, 'profileId is required');
    return;
  }

  try {
    const result = await selectProfile(accountId, profileId, pin);
    sendSuccess(res, { accessToken: result.accessToken });
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Profile selection failed', 403);
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict' });
  sendSuccess(res, { message: 'Logged out' });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies[REFRESH_COOKIE] as string | undefined;
  if (!token) {
    sendError(res, 'No refresh token', 401);
    return;
  }

  try {
    const result = await refreshAccessToken(token);
    sendSuccess(res, { accessToken: result.accessToken });
  } catch {
    sendError(res, 'Invalid or expired refresh token', 401);
  }
}

export async function sendVerificationHandler(req: Request, res: Response): Promise<void> {
  const accountId = req.account?._id.toString();
  if (!accountId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }
  try {
    await sendVerificationCode(accountId);
    sendSuccess(res, { message: 'Verification code sent' });
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to send verification code');
  }
}

export async function verifyEmailHandler(req: Request, res: Response): Promise<void> {
  const { token } = req.body as { token: string };
  if (!token) {
    sendError(res, 'token is required');
    return;
  }
  try {
    await verifyEmail(token);
    sendSuccess(res, { message: 'Email verified successfully' });
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Verification failed', 400);
  }
}

export async function forgotPasswordHandler(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  if (!email) {
    sendError(res, 'email is required');
    return;
  }
  try {
    await forgotPassword(email);
    sendSuccess(res, { message: 'If that email exists, a reset link has been sent' });
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Request failed');
  }
}

export async function resetPasswordHandler(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as { token: string; password: string };
  if (!token || !password) {
    sendError(res, 'token and password are required');
    return;
  }
  try {
    await resetPassword(token, password);
    sendSuccess(res, { message: 'Password reset successfully' });
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Reset failed', 400);
  }
}

export async function deleteAccountHandler(req: Request, res: Response): Promise<void> {
  const accountId = req.account?._id.toString();
  if (!accountId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }
  try {
    await deleteAccount(accountId);
    res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict' });
    sendSuccess(res, { message: 'Account deleted' });
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Delete failed');
  }
}

export async function resendVerificationEmailHandler(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  if (!email) {
    sendError(res, 'email is required');
    return;
  }
  try {
    await resendVerificationEmail(email);
    sendSuccess(res, { message: 'If that email exists and is unverified, a verification link has been sent.' });
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to send verification email');
  }
}

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

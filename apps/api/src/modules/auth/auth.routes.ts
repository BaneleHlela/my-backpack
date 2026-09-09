// Auth router — local and OAuth routes
import { Router, IRouter } from 'express';
import passport from 'passport';
import {
  register,
  login,
  selectProfileHandler,
  logout,
  refresh,
  handleOAuthCallback,
  sendVerificationHandler,
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  deleteAccountHandler,
  resendVerificationEmailHandler,
  guestSignup,
  claimAccountHandler,
} from './auth.controller';
import { requireAccount } from './auth.middleware';
import { IAccountDocument } from '../../models/core/account.model';
import { Response } from 'express';

const router: IRouter = Router();

// Local auth
router.post('/register', register);
router.post('/login', login);
router.post('/select-profile', requireAccount, selectProfileHandler);
router.post('/logout', logout);
router.post('/refresh', refresh);

// Guest mode — a real Account + Profile with no email/password; /claim later adds credentials
// to the same account without touching its profiles or progress
router.post('/guest', guestSignup);
router.post('/claim', requireAccount, claimAccountHandler);

// Email verification
router.post('/send-verification', requireAccount, sendVerificationHandler);
router.post('/resend-verification', resendVerificationEmailHandler);
router.post('/verify-email', verifyEmailHandler);

// Password reset
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);

// Account deletion
router.delete('/account', requireAccount, deleteAccountHandler);

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res: Response) => {
    handleOAuthCallback(req.user as IAccountDocument, res);
  }
);

// Facebook OAuth
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'], session: false })
);
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login', session: false }),
  (req, res: Response) => {
    handleOAuthCallback(req.user as IAccountDocument, res);
  }
);

export default router;

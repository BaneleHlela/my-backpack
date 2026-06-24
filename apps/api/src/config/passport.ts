// Passport strategies: LocalStrategy, GoogleStrategy, FacebookStrategy
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy, Profile as FacebookProfile } from 'passport-facebook';
import Account from '../models/core/account.model';
import { upsertOAuthAccount } from '../modules/auth/auth.service';

export function configurePassport(): void {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const account = await Account.findOne({ email: email.toLowerCase() });
        if (!account) return done(null, false, { message: 'Invalid email or password' });

        const valid = await account.comparePassword(password);
        if (!valid) return done(null, false, { message: 'Invalid email or password' });

        return done(null, account);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        callbackURL: process.env.GOOGLE_CALLBACK_URL ?? '',
      },
      async (_accessToken, _refreshToken, profile: GoogleProfile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const displayName = profile.displayName || 'User';
          const { account } = await upsertOAuthAccount('google', profile.id, email, displayName);
          return done(null, account);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID ?? '',
        clientSecret: process.env.FACEBOOK_APP_SECRET ?? '',
        callbackURL: process.env.FACEBOOK_CALLBACK_URL ?? '',
        profileFields: ['id', 'emails', 'displayName'],
      },
      async (_accessToken, _refreshToken, profile: FacebookProfile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const displayName = profile.displayName || 'User';
          const { account } = await upsertOAuthAccount('facebook', profile.id, email, displayName);
          return done(null, account);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

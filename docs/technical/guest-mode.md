# Guest Mode

*Added August 2026. Scope: backend (`apps/api`, `packages/shared`) + mobile (`apps/mobile`) only
— `apps/web` has no guest entry point yet; that's a deliberately separate, later pass.*

## What a guest actually is

A guest is a real `Account` + `Profile` document with no email/password — **not** a parallel
local-only system, not device-local storage, not a second auth mechanism. `Account.isGuest`
(default `false`) is the only marker. Every existing route gated by `requireProfile` (quiz,
roadmap, vocab, content, enrollment, ai-chat) already works for a credential-less account with
zero changes, because that middleware only checks `Account.findById`/`Profile.findById`, never
credential presence. The 6-profile cap, `POST /api/profiles`, and every learning-progress model
needed no code changes to support guest accounts.

This means a guest's progress is exactly as real and exactly as persistent as a registered
user's, for as long as the app holds a valid refresh token for that account — it is not lost on
app restart. What a guest *can* lose is the account itself: with no email/password, there is no
way to recover access if the device is lost, the app is reinstalled, or the refresh token
expires (7 days) with the app never reopened. "Claiming" (below) is the fix for that, not a
progress-migration step — claiming never creates a new account or profile, it adds credentials
to the one already in use.

## Backend

### Model changes

- `Account.isGuest: boolean` (default `false`) — [account.model.ts](../../apps/api/src/models/core/account.model.ts).
- `IAuthProvider['provider']` gained `'guest'` (alongside `'local' | 'google' | 'facebook'`) — a
  guest account's sole `authProviders[]` entry is `{ provider: 'guest', providerId: <random hex> }`,
  mirroring how `upsertOAuthAccount` shapes an OAuth entry.
- Mirrored into `packages/shared/types/account.ts` (`IAccount.isGuest`, `IAuthProvider`) and
  `packages/shared/types/profile.ts` (`IProfile.isGuest`) — both are joined-in fields, not stored
  on `Profile` itself (see "Where isGuest actually lives" below).

### `POST /api/auth/guest` — create and sign in

`createGuestAccount(displayName?, ageGroup = 'adult')` in
[auth.service.ts](../../apps/api/src/modules/auth/auth.service.ts), modeled directly on
`upsertOAuthAccount`: creates the `Account` (`isGuest: true`), creates the owner `Profile`
(`isOwner: true`, `isSetupComplete: true`, `displayName` defaulting to `'Guest'`), links them,
and returns a **full access token directly** via `signFullToken` — the partial-token/
select-profile round trip is skipped entirely, since there's exactly one profile and nothing to
verify (no PIN, no picking). Also returns a refresh token, following `login`'s exact
mobile-vs-web convention: included in the JSON body only when `X-Client-Type: mobile` is set,
set as an httpOnly cookie either way.

`ageGroup` defaults to `'adult'` — content doesn't currently differ meaningfully by age group,
so this isn't a real UX cost, and it's changeable later via `PATCH /api/profiles/me`.
`isSetupComplete: true` at creation means the `dateOfBirth`/`education.currentLevel` step is
deferred indefinitely, not asked at signup — a guest can still complete it later by voluntarily
calling the existing `PATCH /api/profiles/me/setup`; this only stops it from *blocking* entry.

### `POST /api/auth/claim` — add credentials to the account already in use

`claimAccount(accountId, email, password)`, gated by `requireAccount` (not `requireOwner` —
`DELETE /auth/account` isn't owner-gated either, so this stays consistent with that existing
precedent). Rejects if the account already has an `email`/`password` set, or if another account
already owns that email (same check `registerLocal` runs). On success: sets `email`, `password`
(hashed by the existing `pre('save')` hook), flips `isGuest` to `false`, appends a `'local'`
`authProviders` entry, and sends a verification email through the same (currently stubbed —
see `registerLocal`) pattern every other verification flow in this codebase uses. **Never
touches `profiles`/`activeProfile`, never creates a new profile** — same account, same
progress, no logout, no re-login.

### Rate limiting

A second, stricter limiter (`creationLimiter` in [app.ts](../../apps/api/src/app.ts): 20/hour)
sits on top of the blanket `authLimiter` (2000/15min), scoped to just `/api/auth/register` and
`/api/auth/guest` — the two unauthenticated, zero-cost-to-call endpoints that create a database
record.

### Where `isGuest` actually lives, and how it reaches the client

`isGuest` is a fact about the **Account**, not the Profile — but every client-facing profile
shape (`ProfileSummary`, `IProfile`) needed to carry it, since UI decisions (the mobile claim
entry points below) key off the *active profile's* guest status. Three call sites join it in:

- `toProfileSummary()` in both `auth.service.ts` and `profile.service.ts` now take an explicit
  `isGuest: boolean` parameter, supplied by the `Account` document already in scope at each call
  site (`loginLocal`, `getProfilesForAccount`, `getProfilesByAccountId`) — no extra query.
- `GET /profiles/me`, `PATCH /profiles/me`, and `PATCH /profiles/me/setup`
  ([profile.controller.ts](../../apps/api/src/modules/profile/profile.controller.ts)) merge it
  in via a `withIsGuest()` helper that reads `req.account.isGuest` — already loaded onto the
  request by the `requireProfile` middleware, so this is a free join, not a second query either.
  All three routes matter: `activeProfile` in the mobile Redux store gets replaced wholesale by
  both `fetchActiveProfile` and `completeProfileSetup`, so if either response dropped `isGuest`
  a guest who voluntarily finishes profile setup would silently lose their claim entry point
  until the next full refetch.

## Mobile

### Entry point — Login screen

"Continue as guest" is a new, visually secondary action on the existing
[`(auth)/login.tsx`](../../apps/mobile/app/(auth)/login.tsx) — not a new screen.
`LaunchScreen.tsx` already owns the "first impression while things load" concern (a deliberately
branded logo+spinner treatment reused across every loading gate); a new entry screen would only
add surface area, not fix anything open. It reads as a plain underlined text link beneath the
Sign in / Sign up block, since this is the fast path, not the primary one — most returning users
are logging in.

`continueAsGuest` (new thunk, `authSlice.ts`) posts to `/auth/guest` and sets `accessToken`/
`isAuthenticated` directly — no `partialToken`, no `/select-profile` hop. It deliberately does
**not** set `activeProfile` itself: the guest-signup response's `profile` field is only
`ProfileSummary`-shaped (no `accountId`/`education`/`preferences`/`progress` — fields `IProfile`
requires), so the Login screen's `handleGuest` dispatches `fetchActiveProfile()` immediately
after, the same two-step "select → fetch full profile" shape already used by
`select-profile.tsx` and `ProfileSwitcherModal.tsx`'s `doSelectAndNavigate`. From tap to
`/(app)/home` is two network calls, not one, but no unsafe type casting and no new pattern.

A guest with a full token and `isSetupComplete: true` then flows through `ProtectedRoute`/
`(app)/_layout.tsx` exactly like any other fully-set-up user — no changes needed there.

### Claiming — same session, just add credentials

`ClaimAccountModal` ([`src/components/ClaimAccountModal.tsx`](../../apps/mobile/src/components/ClaimAccountModal.tsx))
is a focused, single-purpose modal (same pattern as `PinEntryModal.tsx` — a centered `Modal`,
not a route): email, password, confirm password, client-side length/match checks mirroring
`signup.tsx`. Dispatches the `claimAccount` thunk, which on success flips
`state.activeProfile.isGuest` to `false` locally (no refetch needed — the server confirms, the
client just trusts it) and surfaces a success message. **No logout, no re-login** — the guest
keeps their current session throughout.

Two independent trigger points render the same modal:

1. **`ProfileSwitcherModal.tsx`** — a "Save your progress" row, shown only when
   `activeProfile.isGuest`, placed alongside the existing "Add Profile"/"Sign out" rows. This is
   the deliberate account-level entry point, reachable any time via `Menubar`'s avatar.
2. **`GuestProgressNudge`** ([`src/components/quiz/GuestProgressNudge.tsx`](../../apps/mobile/src/components/quiz/GuestProgressNudge.tsx)) —
   a one-time, dismissible overlay shown from `QuizSessionScreen.tsx` the first time a guest
   profile completes a quiz session, tied to a genuine achievement moment rather than a timer or
   an every-launch interruption (consistent with
   [docs/business/monetisation.md](../business/monetisation.md)'s "no dark patterns" stance).
   Whether it's already been shown is tracked per-profile in `expo-secure-store`
   (`hasShownGuestNudge`/`markGuestNudgeShown` in `secureStore.ts`), so it survives app restarts
   without needing a backend field. It never blocks navigation — "Maybe later" and the backdrop
   both just dismiss it, same as any other optional prompt in this app.

### What was deliberately not built here

- **Guest accounts are not capped below the normal 6-profile limit.** `POST /api/profiles` is
  already owner-gated and doesn't care whether the account has credentials.
- **"Add Profile" is still a dead end for a guest**, exactly as it already was for a real
  account: `ProfileSwitcherModal`'s "Add Profile" row navigates to `/select-profile`, which
  `ProtectedRoute`'s `requireFullToken: false` guard immediately bounces back to `/(app)/home`
  whenever a full access token already exists (no "create a new profile" form exists on either
  platform yet — see root `CLAUDE.md`'s "Profile management screens"). This pass didn't
  introduce any new restriction here and didn't fix the pre-existing one either.
- **`apps/web` has no guest entry point.** A deliberately separate, later pass.
- **No offline/local-only fallback.** A guest with no network on first launch simply can't
  create an account yet — same as registration today.

## Verification performed

Backend endpoints were exercised end-to-end against the real dev Atlas database (not mocked):
`POST /api/auth/guest` (created a real Account+Profile, `isGuest: true` came back correctly),
`GET /api/profiles/me` (confirmed `isGuest` is joined in), `POST /api/profiles` (added a second,
non-owner profile to the guest account — the 6-profile cap needed no changes, as expected),
`POST /api/quiz/session` against a course's pool quiz (returned real questions; session
start and abandon both completed normally — no different from a registered account),
`POST /api/auth/claim` (flipped `isGuest` to `false`, confirmed via a follow-up `GET
/profiles/me`), and a repeat `POST /api/auth/claim` call correctly rejected with "This account
already has sign-in credentials". The `creationLimiter` rate limit was confirmed live via
response headers (`RateLimit-Limit: 20`). One unrelated pre-existing issue surfaced during this
test and was **not** touched: submitting an answer to a specific seeded `dnd_count` question in
the Number Sense course pool failed with `AnswerRecord validation failed: termId required` —
confirmed (by reading `answerRecord.model.ts`) to be a global schema requirement that would fail
identically for any account type, guest or not; a pre-existing data/seed gap, not a guest-mode
regression.

`apps/mobile` changes were verified via `tsc --noEmit` (clean across `apps/api`, `apps/mobile`,
and `apps/web` — the one `apps/web` error found, an unrelated unused-import lint in
`Scribbler.tsx`, predates this change and wasn't touched) — **not yet confirmed on a real
device/emulator**, per this project's established "flag what's unverified" convention (see
`mobile-architecture.md`'s `dnd_single` entries for precedent). The test Account/Profiles
created during backend verification were deleted afterward via `DELETE /api/auth/account`,
except one throwaway guest account (created while checking rate-limit response headers, no
email/PII, zero progress) that couldn't be cleaned up because the sandboxed test environment's
network egress only permitted the first outbound MongoDB connection of the session — flagged to
the user directly rather than left undisclosed.

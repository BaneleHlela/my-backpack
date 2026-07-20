# Mobile Architecture

`apps/mobile` is a React Native + Expo app sharing types, API contracts, and
design tokens with `apps/web` via `packages/shared`. This document describes
the mobile-specific structure, wiring, and decisions that don't apply to the
web app. See [architecture.md](architecture.md) for the system-wide picture —
this doc only covers what's different about the mobile client.

**Scope of the first mobile build:** Expo scaffold, auth (email/password
only — no OAuth on native yet), a minimal Home screen (subject/enrollment
navigation, no roadmap visualisation), and the Dictionary mini-app. Roadmap
UI, Quiz UI, and DnD question types are deferred — Dictionary is the only
mini-app ported in this pass, chosen because it's architecturally standalone
(not roadmap-gated).

---

## Routing — Expo Router

File-based routing, mirroring the segment structure of the web app's route
tree where it makes sense, adapted to Expo Router's group syntax:

```
apps/mobile/app/
  _layout.tsx              # Redux <Provider>, font/splash handling, renders <Slot />
  (auth)/
    _layout.tsx             # Stack for unauthenticated screens
    login.tsx
    signup.tsx
  select-profile.tsx
  profile-setup.tsx
  (app)/
    _layout.tsx             # Guarded layout — redirects based on auth state
    home.tsx
    miniapp/
      [miniAppId]/
        index.tsx           # Dictionary home: search, trending, A–Z browse, recent
        term/[termId].tsx
        bucket.tsx
```

`(auth)` and `(app)` are route groups (parens excluded from the URL) used
purely to attach different guard logic per layout — same purpose as web's
`ProtectedRoute` wrapper, just expressed as a layout file instead of a
component wrapper.

**Gotcha: never name a `src/` subfolder `app`.** Expo Router silently
prefers `src/app/` over the project-root `app/` as its routes directory
whenever a `src/` folder exists — this is documented Expo Router behaviour,
not a bug. The Redux store originally lived at `src/app/store.ts` (mirroring
web's `apps/web/src/app/store.ts`), which meant `npx expo export` was
routing against `src/app` instead of the real `app/` tree (visible as
`Using src/app as the root directory for Expo Router` in the export log,
and confirmed by a route-count mismatch between exports). Fixed by moving
the store to `src/store/store.ts` — plain, but the one directory name to
avoid under `src/` in an Expo Router project is `app`.

### Guard logic

Ported from `apps/web/src/components/ProtectedRoute.tsx`'s three-state
branching, using `<Redirect href="..." />` in place of React Router's
`<Navigate>`:

1. No token → `(auth)/login`
2. Partial token only (post-login, pre-profile-select) → `select-profile`
3. Full token but `isSetupComplete: false` → `profile-setup`
4. Full token + setup complete → allowed into `(app)`

`isCheckingAuth` (true until the app's bootstrap thunk resolves) gates all of
the above to avoid a flash of the login screen on cold start — see
Bootstrap flow below.

---

## State management

Redux Toolkit, reusing web's slice shapes and thunk signatures directly —
`packages/shared` types (`IAccount`, `IProfile`, `ProfileSummary`,
`LoginResponse`, `RegisterResponse`, `SelectProfileResponse`, `ApiResponse`,
`ProfileSetupDto`) are imported, never redefined locally, so a divergence
between the two clients' auth state is a type error, not a runtime surprise.

Slices for this pass:

| Slice | Mirrors (web) | Notes |
|---|---|---|
| `auth` | `features/auth/authSlice.ts` | Same thunks, minus `checkAuth`'s cookie dependency — see Bootstrap flow |
| `content` | `features/enrollment/enrollmentSlice.ts` + `roadmapSlice.ts`'s `fetchSubjectTopics` | Enrollment + standalone-miniapp listing only, no roadmap fetch |
| `vocab` | `features/vocab/vocabSlice.ts` | Ported near-verbatim — plain RTK + axios, nothing web-specific |

### Bootstrap flow (replaces web's cookie-based `checkAuth`)

Web silently refreshes on load because the browser sends the httpOnly
refresh cookie automatically. Native has no equivalent, so mobile reads the
refresh token back out of SecureStore explicitly on launch:

```
app cold start
  → bootstrapAuth() thunk
      → getRefreshToken() from SecureStore
      → if present: POST /auth/refresh { refreshToken } → store accessToken
                     → fetchActiveProfile()
      → if absent: leave state unauthenticated → guard redirects to login
```

---

## Token storage strategy

| Token | Lifetime | Storage | Why |
|---|---|---|---|
| Partial token | 5 min | Redux (memory only) | Short-lived, cheap to re-derive, never needs to survive a restart |
| Full access token | 15 min (1d in dev) | Redux (memory only) | Same reasoning as web |
| Refresh token | 7 days | `expo-secure-store` (iOS Keychain / Android Keystore) | Must survive app restarts; native has no persistent cookie jar, so this is the standard Expo/RN substitute for the web app's httpOnly cookie |

Only the refresh token touches disk. This requires a small, additive backend
change — see "Backend change: mobile refresh token" below — since the API
previously issued the refresh token exclusively as an httpOnly cookie, which
native can't reliably persist across restarts.

`apps/mobile/src/lib/secureStore.ts` wraps `expo-secure-store` with
`saveRefreshToken` / `getRefreshToken` / `deleteRefreshToken`, guarding
`Platform.OS === 'web'` (SecureStore has no web implementation) so an
`expo start --web` preview during development doesn't crash — not a target
platform per `CLAUDE.md`, just a defensive no-op.

### Backend change: mobile refresh token

`apps/api/src/modules/auth/auth.controller.ts` now also returns the refresh
token in the JSON body — gated behind an `X-Client-Type: mobile` request
header so web's cookie-only behaviour is completely unchanged:

- `login`: response includes `refreshToken` in the body only when the
  request carried `X-Client-Type: mobile`.
- `refresh`: accepts `{ refreshToken }` in the request body, preferring it
  over the cookie when both are absent/present — the cookie path is
  untouched for web.
- `apps/mobile/src/lib/api.ts`'s axios instance sets `X-Client-Type: mobile`
  as a default header on every request.

No DB migration or server-side token store was needed — refresh tokens are
stateless signed JWTs (`signRefreshToken` / `verifyRefreshToken` in
`apps/api/src/utils/jwt.ts`); the change is purely about which channel
carries the same token to the client.

---

## API client

`apps/mobile/src/lib/api.ts` mirrors `apps/web/src/lib/axios.ts`'s
interceptor pattern:

- `axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL })`, with
  `X-Client-Type: mobile` set as a default header.
- Request interceptor: attaches `Authorization: Bearer <token>` from Redux
  auth state (partial or full token, whichever is current).
- Response interceptor: on a 401 not already retried, calls
  `POST /auth/refresh` with `{ refreshToken }` (read from Redux, itself
  hydrated from SecureStore at launch), stores the new `accessToken`,
  retries the original request once. On refresh failure, dispatches
  `logout()`.

---

## Theme / design-token system

`docs/design/brand-guide.md` left the accent palette undefined, and
`apps/web` has been hardcoding Tailwind utility classes (`bg-violet-500`,
`bg-white/40`, etc.) rather than reading from a shared source. Mobile has no
Tailwind equivalent by default (this is a plain `StyleSheet`-based build, not
NativeWind — see "Why not NativeWind" below), which forced the token question
that's been implicit on web: `packages/shared/constants/theme.ts` is now the
single source of truth for colour, spacing, radius, and typography for
**both** apps, formalising the palette already in de facto use on web rather
than inventing a new one. `docs/design/brand-guide.md` has been updated to
point here instead of saying "to be defined."

Shape: `colors` (background, primary/success/warning/error each with
light/DEFAULT/dark, text, surface — the glass fill/border tones), `radii`,
`spacing`, `typography`. Exported from `packages/shared/index.ts` alongside
the existing type/constant exports. Plain TypeScript, no JSX — importable
from either app.

### Base UI primitives (`apps/mobile/src/components/`)

Every primitive reads exclusively from `theme.ts` — no hardcoded hex codes in
component files:

- **`GlassCard`** — the frosted-glass surface that's the brand's signature
  element. RN has no `backdrop-filter`; `expo-blur`'s `<BlurView>` is layered
  under a semi-transparent fill to approximate it.
- **`PrimaryButton`** — solid violet button with the same default/loading/
  disabled states as web's "Add to bucket" button.
- **`ScreenBackground`** — mobile's equivalent of web's `AppLayout`: wraps
  screens in the portrait wallpaper via `ImageBackground`.
- **`TextField`** — labelled glass-surface text input for the auth forms.

### Why not NativeWind

A first mobile pass with plain `StyleSheet.create` avoids an extra babel/
metro configuration surface while the app is still finding its shape.
NativeWind v4 is the natural choice if/when closer class-for-class parity
with web's Tailwind usage is wanted, but that's a deliberate follow-up, not
part of this build.

### Dark mode — explicitly not built

`docs/design/brand-guide.md` avoids dark backgrounds by design, and
`IPreferences.theme` exists in the schema without an implementation on
either client. No dark palette variant exists in `theme.ts`.

---

## Metro / monorepo wiring

pnpm's hoisting is less aggressive than npm/yarn's, and `packages/shared` is
a pnpm symlink — this needs explicit Metro configuration to resolve inside a
workspace:

```js
// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
```

`watchFolders` includes the monorepo root so a change in `packages/shared`
triggers a Metro reload, not just changes inside `apps/mobile`.

**Do not set `resolver.unstable_enableSymlinks` or
`resolver.disableHierarchicalLookup`.** Expo SDK 57's `expo/metro-config`
already enables symlink support and hierarchical `node_modules` lookup by
default — this was the opposite of what an earlier draft of this doc
assumed, written against older guidance. Forcing
`disableHierarchicalLookup: true` was tried and it broke resolution of
transitive dependencies living inside pnpm's nested
`.pnpm/<pkg>/node_modules` (concretely: `@expo/metro-runtime`'s own
dependency on `whatwg-fetch` failed to resolve, even though the file existed
on disk at the expected symlinked path) — `npx expo-doctor` flags both
overrides for exactly this reason, and `npx expo export` reproduced the
failure directly. Removing both fixed it; `expo export --platform android`
now bundles cleanly (1241 modules, includes `packages/shared` resolved
through its pnpm symlink) and `expo-doctor` reports 20/20 checks passing.
Re-verify against https://docs.expo.dev/guides/monorepos/ if bumping SDK
versions later — this guide's recommended shape has changed across
releases before.

If TypeScript can't resolve `@my-backpack/shared` through the same path
`apps/web` uses (via `packages/shared/package.json`'s `exports` map), a path
alias fallback is added to `apps/mobile/tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@my-backpack/shared": ["../../packages/shared/index.ts"],
      "@my-backpack/shared/*": ["../../packages/shared/*"]
    }
  }
}
```

---

## Environment variables

Expo auto-loads `EXPO_PUBLIC_`-prefixed variables from `.env` with no extra
config. `apps/mobile/.env.example`:

```
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

The value differs by how the app is being run locally — there is no single
correct default:

| Runtime | `EXPO_PUBLIC_API_URL` |
|---|---|
| iOS Simulator | `http://localhost:5000/api` |
| Android Emulator | `http://10.0.2.2:5000/api` (the emulator's alias for the host machine) |
| Physical device via Expo Go | `http://<dev-machine-LAN-IP>:5000/api` — `localhost` on the phone means the phone itself |

`apps/api/.env.example`'s `CLIENT_URL` is used for CORS/OAuth redirects for
the **web** client only. Native requests don't send an `Origin` header, so
mobile doesn't need this variable to function — noted here so it isn't
"fixed" unnecessarily later.

---

## What's deliberately not here yet

- **Roadmap UI** — node path, lesson player, progress bars. Dictionary works
  without it because it isn't roadmap-gated; other mini-apps (e.g. isiZulu
  Sounds) are, and are simply not linked from Home until this exists.
- **Quiz UI / `dnd_*` question types** — no question renderer of any kind
  ships in this pass.
- **OAuth on native** — deep-link/AuthSession work for Google/Facebook is a
  separate follow-up; email/password only for now.
- **Forgot-password / reset-password / verify-email screens** — the backend
  flow for these is fully built (SMTP send, token + expiry, dedicated
  routes) and already has web pages; mobile screens are simply deferred to
  keep this build scoped, not because anything is missing server-side.
- **A teacher/dashboard-facing surface** — web/desktop territory per
  `CLAUDE.md`.

---

*Last updated: 2026-07-19.*

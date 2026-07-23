# Mobile Architecture

`apps/mobile` is a React Native + Expo app sharing types, API contracts, and
design tokens with `apps/web` via `packages/shared`. This document describes
the mobile-specific structure, wiring, and decisions that don't apply to the
web app. See [architecture.md](architecture.md) for the system-wide picture —
this doc only covers what's different about the mobile client.

**Scope of the first mobile build:** Expo scaffold, auth (email/password
only — no OAuth on native yet), a minimal Home screen (subject/enrollment
navigation, no roadmap visualisation), and the Dictionary mini-app —
Dictionary was the only mini-app ported in that first pass, chosen because
it's architecturally standalone (not roadmap-gated).

**Scope as of the Roadmap/Lesson/Quiz build (July 2026):** Course/Roadmap
navigation, a Lesson resource player, and a quiz-taking engine for 13 of the
20 question types now exist too — see "Roadmap, Lesson & Quiz UI" below.
OAuth on native, forgot/reset-password/verify-email screens, live TTS, the
remaining 7 `dnd_*` question types, `mcq_audio`, and a teacher/dashboard
surface are still deferred.

---

## Routing — Expo Router

File-based routing, mirroring the segment structure of the web app's route
tree where it makes sense, adapted to Expo Router's group syntax:

```
apps/mobile/app/
  _layout.tsx              # Redux <Provider> + GestureHandlerRootView, font/splash handling,
                            # renders <Stack screenOptions={{ headerShown: false }}> (was a
                            # bare <Slot/> before the Roadmap/Lesson/Quiz build — see below)
  (auth)/
    _layout.tsx             # Stack for unauthenticated screens
    login.tsx
    signup.tsx
  select-profile.tsx
  profile-setup.tsx
  (app)/
    _layout.tsx             # Guarded layout — redirects based on auth state
    home.tsx
    subject/
      [subjectSlug]/
        index.tsx           # Courses grid + Subject-level MiniApps
        course/
          [courseSlug]/
            index.tsx       # Progress header + RoadmapPath + linked-MiniApps row
            lesson/
              [lessonId].tsx  # Lesson resource player
    miniapp/
      [miniAppId]/
        index.tsx           # Dictionary home: search, trending, A–Z browse, recent
        term/[termId].tsx
        bucket.tsx
  quiz/
    [itemId].tsx            # Root-level, NOT nested in (app) — full-screen quiz-taking route,
                            # presentation: 'fullScreenModal' (see "Roadmap, Lesson & Quiz UI")
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

Slices:

| Slice | Mirrors (web) | Notes |
|---|---|---|
| `auth` | `features/auth/authSlice.ts` | Same thunks, minus `checkAuth`'s cookie dependency — see Bootstrap flow |
| `content` | `features/enrollment/enrollmentSlice.ts` + `features/subjects/subjectsSlice.ts` + `features/courses/coursesSlice.ts` | Kept as one slice (not split three ways like web) — mobile doesn't yet have the independently-reused-pages pressure that motivated web's split. `fetchCoursesBySubject`/`fetchCourseDetail` added for the Roadmap/Lesson/Quiz build; `courseDetailByKey` exists only because the Course list endpoint returns unpopulated `miniAppIds` (plain id strings) — only the single-course detail endpoint populates them |
| `vocab` | `features/vocab/vocabSlice.ts` | Ported near-verbatim — plain RTK + axios, nothing web-specific |
| `roadmap` | `features/roadmap/roadmapSlice.ts` | Direct port — `currentRoadmap`/`currentNode`/`currentLesson`, `fetchRoadmapByCourse`/`fetchLesson` |
| `quiz` | `features/quiz/quizSlice.ts` | Scoped to what `QuizItemPlayerPage` actually calls (`startQuizItemSession`/`submitAnswer`/`completeSession`/`abandonSession`) — the generic miniAppId-based `startSession` and the unused `GET session/:id`/`GET results` endpoints aren't ported |

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

## Dictionary mini-app

Ported component-for-component from `apps/web/src/pages/DictionaryPage/` —
same API calls, same behaviour. `src/features/vocab/vocabSlice.ts` is a
near-verbatim port (plain RTK + axios against `src/lib/api.ts`, nothing web-
specific to change).

**Pronunciation playback** uses `expo-audio`'s imperative `createAudioPlayer`
(`src/lib/audio.ts`), not `expo-av` (deprecated) and not the `useAudioPlayer`
hook (that hook is for a stable, known-ahead-of-time source; here the URL
changes on every tap — search result, term detail, bucket entry — so each
tap creates its own short-lived player and releases it via a
`playbackStatusUpdate` listener once `didJustFinish` fires).

**Gotcha: don't nest a paginating FlatList inside a ScrollView.** Web's
`DictionaryBrowseList` owns its own scroll area alongside sibling sections
(search, trending, alphabet picker, recent) stacked in a parent scroll
container — normal for the web DOM. RN doesn't support that: a `FlatList`
nested inside a `ScrollView` won't fire `onEndReached` correctly against the
outer scroll position. The Dictionary home screen
(`app/(app)/miniapp/[miniAppId]/index.tsx`) is instead built as a single
top-level `FlatList` whose `data` is the browse results, with search/
trending/alphabet-picker in `ListHeaderComponent` and recent-searches in
`ListFooterComponent`. `DictionaryBrowseList.tsx` reflects this: it exports
a `useDictionaryBrowse` data hook and a `BrowseResultRow` renderer rather
than a self-contained scrolling component the way web's version is. Keep
this in mind before adding another paginated list on mobile — reach for the
same pattern (hook + row renderer plugged into the screen's own `FlatList`)
rather than a nested scroll container.

---

## Environment variables

Expo auto-loads `EXPO_PUBLIC_`-prefixed variables from `.env` with no extra
config. `apps/mobile/.env.example` (now committed, matching this exactly):

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

## Roadmap, Lesson & Quiz UI

The first mobile build deliberately shipped without these (see "What's
deliberately not here yet" below, historically) — this section covers the
follow-up build that ports Course/Roadmap navigation, the Lesson resource
player, and a quiz-taking engine for the 13 question types already working on
web (12 text-based types + `dnd_single`; the other 7 `dnd_*` types and
`mcq_audio` show the same "not yet supported" placeholder web shows for them,
not a new mobile-only renderer). This is a straight port of already-working
web code (`CoursePage`, `LessonPlayerPage`, `QuizItemPlayerPage`,
`components/roadmap/*`, `components/quiz/*`) into RN idioms, not a redesign.
**No backend changes were needed** — every route this build uses
(`/api/content/.../courses`, `/api/roadmap/...`, `/api/quiz/...`) already
existed and already returns the shapes the mobile client needs.

### New routes

```
apps/mobile/app/
  (app)/
    subject/[subjectSlug]/
      index.tsx                        # Courses grid + Subject-level MiniApps section
      course/[courseSlug]/
        index.tsx                      # Roadmap for one Course (progress header + path)
        lesson/[lessonId].tsx          # Lesson resource player
  quiz/[itemId].tsx                    # Full-screen quiz-taking route — see below
```

### Why `quiz/[itemId]` is a root-level route, not nested in `(app)`

There is no tab bar in this app yet — `(app)` is currently just a guarded
`<Slot/>` wrapping whatever screen is active. Placing the quiz screen at the
root, as a sibling of `(app)`/`(auth)`/`select-profile`/`profile-setup`,
means it never needs to be deliberately *hidden* from whatever navigator
eventually ends up owning Home/Progress/Settings tabs — it simply isn't part
of that navigator, the same way it isn't part of `(app)` today. It also gets
its own `presentation: 'fullScreenModal'` + `headerShown: false` Stack
options (see below) without those options leaking onto any other route.

### Root layout: `<Slot/>` → `<Stack/>`

Every route in the app previously rendered through a bare `<Slot/>` in the
root `_layout.tsx` — no route had per-screen navigation options, because
`<Slot/>` doesn't support them. Making the quiz route a true full-screen
modal (no header, no shared-element transition, covers the whole screen)
requires the root layout to render a `<Stack screenOptions={{ headerShown:
false }}>` instead, with one explicit override:

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="quiz/[itemId]" options={{ presentation: 'fullScreenModal' }} />
</Stack>
```

`headerShown: false` on `screenOptions` preserves the exact zero-header look
every existing route already had under `<Slot/>` — this is a structural
change with no visual change for anything except the new quiz route.
`GestureHandlerRootView` also wraps the root `<Provider>` here, needed for
the `dnd_single` gesture work below.

### New dependencies

- `react-native-gesture-handler` — promoted from an incidental transitive
  dependency (pulled in via `expo-router`'s drawer component) to a direct,
  `expo install`-managed one, needed for `dnd_single`'s drag gestures.
- `expo-video` — Lesson `video` resources (`VideoView`/`useVideoPlayer`);
  every seeded Lesson today is a video intro. Not `expo-av` (deprecated).
- `react-native-markdown-display` — Lesson `notes` resources; nothing
  markdown-capable existed in the mobile dependency tree before this.
- DnD library for `dnd_single` — see the DnD section below.

### DnD (`dnd_single`)

Web's `DndSinglePattern.tsx` uses `@dnd-kit/core`, which is React-DOM-only
and has no RN equivalent. `react-native-reanimated-dnd` was evaluated as a
drop-in (its `Draggable`/`Droppable` API shape maps closely onto dnd-kit's,
and it's pure JS with no native code of its own, built on Reanimated 4 +
Gesture Handler — both already present). Its peer-dependency ranges are
satisfied by this app's exact versions (RN 0.86, Reanimated 4.5, Gesture
Handler 2.32), so raw SDK-version compatibility wasn't actually the
blocker — reading its `useDraggable` hook source directly turned up a hard
behavioral one instead: **it always accepts any collision as a valid drop
and animates the item permanently into the drop zone** — `Droppable`'s
`onDrop` callback is fire-and-forget (`void` return), with no hook to
reject a drop and bounce the item back. That's incompatible with
`helpers.retryUntilCorrect` (a wrong drop must never reach `onAnswer` and
must bounce back to the pool) — and `retryUntilCorrect` is `true` on all 6
vowels `dnd_single` quiz variants, the primary graded content this pattern
serves. The package was removed after this finding.

**What was built instead**: a hand-rolled implementation directly on
`react-native-gesture-handler` + Reanimated shared values —
`Gesture.Pan()`/`Gesture.Tap()` composed via `Gesture.Race` (`.minDistance(8)`
/`.maxDistance(8)` mirrors dnd-kit's 8px `PointerSensor` activation
distance — short movement lets Tap win the race and fire the tap-to-hear-
audio behavior, longer movement activates Pan), with drop-zone hit-testing
done in JS (via `runOnJS`) against a rect measured with
`measureInWindow()`, compared against the gesture's `absoluteX`/`absoluteY`
on release. This gives full control over accept/reject, which
`retryUntilCorrect` needs. One simplification from web: once an item is
accepted into the drop zone it renders as a non-draggable (but still
tap-for-audio) tile there — web supports dragging a placed item back out
when `helpers.allowUndo` is set; that's not reproduced, since it's a
secondary polish behavior not exercised by the graded content paths
(`autoSubmit` fires immediately on every vowels variant, disabling the
question right after).

A real bug worth flagging for future worklet code in this codebase: gesture
callbacks (`onStart`/`onUpdate`/`onEnd`) run as worklets on the UI thread —
calling a plain JS function (state setters, audio playback) directly from
inside one compiles and bundles fine, and only fails at runtime when the
gesture actually fires. Every JS-side call from inside a gesture callback
must cross back via `runOnJS(fn)(...)`.

**Verification caveat**: this environment has no Android/iOS emulator or
device attached, so gesture behavior could not be confirmed visually here.
Verification performed instead: `tsc --noEmit` (typed Gesture Handler/
Reanimated API surface), and a full `npx expo export --platform android`
(real Metro/Babel bundle, 4002 modules, no errors) — this catches babel/
worklet-transform and module-resolution failures, but not runtime gesture
behavior. **The actual drag interaction — accept, reject/bounce-back,
tap-for-audio, hint highlight — needs a real on-device smoke test before
this ships**, per Phase 5 of the mobile roadmap/quiz plan.

### 5-prompt roadmap

This is prompt 1 of 5 for finishing the learner-facing mobile app (Studio,
`apps/web/src/pages/studio/`, stays PC-only web across all 5 — out of scope
throughout):

1. **This prompt** — Course/Roadmap navigation, Lesson player, quiz engine
   for the 13 working question types.
2. Question types 14–20 (the remaining `dnd_*` types + `mcq_audio`).
3. Live TTS / word-highlighting on mobile (the `SpokenText` equivalent).
4. Profile management screens, OAuth on native, forgot/reset-password/
   verify-email screens.
5. Peanuts/XP rewards and test-readiness UI, once their backend services
   exist (both are currently schema-only — see root `CLAUDE.md`).

---

## What's deliberately not here yet

- **7 of the 8 `dnd_*` question types, plus `mcq_audio`** — only `dnd_single`
  has a renderer; the rest show the same placeholder web shows for them.
  Prompt 2 of the 5-prompt roadmap above.
- **Live TTS / word-highlighting** — question prompts, avatar dialogue, and
  feedback all render as plain text with no speech. Prompt 3.
- **OAuth on native** — deep-link/AuthSession work for Google/Facebook is a
  separate follow-up; email/password only for now. Prompt 4.
- **Forgot-password / reset-password / verify-email screens** — the backend
  flow for these is fully built (SMTP send, token + expiry, dedicated
  routes) and already has web pages; mobile screens are simply deferred to
  keep this build scoped, not because anything is missing server-side.
  Prompt 4.
- **Profile management screens.** Prompt 4.
- **Peanuts/XP rewards and test-readiness UI** — deferred until their
  backend services exist (both are schema-only today — see root
  `CLAUDE.md`). Prompt 5.
- **A teacher/dashboard-facing surface** — web/desktop territory per
  `CLAUDE.md`.
- **On-device confirmation of the `dnd_single` gesture interaction** — see
  the DnD section above; built and statically verified (typed API surface,
  clean Metro/Babel bundle) but not yet smoke-tested on a real device or
  emulator from this environment.

---

*Last updated: 2026-07-23.*

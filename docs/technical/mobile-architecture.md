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
navigation, a Lesson resource player, and a quiz-taking engine for 16 of the
20 question types now exist too — see "Roadmap, Lesson & Quiz UI" and
"Question types 14–20 & Dictionary quiz" below. Live TTS (question prompts,
DnD dialogue, and answer feedback read aloud on demand) also now exists —
see "Live TTS (Prompt 3)" below. OAuth on native, forgot/reset-password/
verify-email screens, the remaining 5 `dnd_*` question types (`dnd_select`,
`dnd_sort`, `dnd_sequence`, `dnd_match`, `dnd_fill` — no seeded content
exists for any of them yet), and a teacher/dashboard surface are still
deferred.

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
            index.tsx       # Progress header + flattened RoadmapPath + linked-MiniApps row +
                             # CoursePathActions + LessonModal/ResourcesModal (Phase C — see below;
                             # the old lesson/[lessonId].tsx route is gone, replaced by LessonModal)
    miniapp/
      [miniAppId]/
        index.tsx           # Dictionary home: search, trending, A–Z browse, recent
        term/[termId].tsx
        bucket.tsx
  quiz/
    [itemId].tsx            # Root-level, NOT nested in (app) — full-screen quiz-taking route,
                            # presentation: 'fullScreenModal' (see "Roadmap, Lesson & Quiz UI")
    dictionary/
      [miniAppId].tsx       # Same treatment, for a mini-app's default Quiz (Dictionary's
                            # "Take Quiz") — see "Question types 14–20 & Dictionary quiz"
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
| `quiz` | `features/quiz/quizSlice.ts` | Scoped to what the quiz screens actually call (`startQuizItemSession`/`startMiniAppQuizSession`/`submitAnswer`/`completeSession`/`abandonSession`) — the unused `GET session/:id`/`GET results` endpoints still aren't ported. `startMiniAppQuizSession` (added in Prompt 2, for Dictionary's "Take Quiz") is the `miniAppId`-based sibling of `startQuizItemSession`; both share one set of `pending`/`fulfilled`/`rejected` reducers via `isAnyOf` matchers rather than duplicating identical logic twice |

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

Shape: `lightColors`/`darkColors` (background, primary/success/warning/error each with
light/DEFAULT/dark, text, surface — the glass fill/border tones), `radii`,
`spacing`, `typography`. Exported from `packages/shared/index.ts` alongside
the existing type/constant exports. Plain TypeScript, no JSX — importable
from either app. `IThemeColors` is the explicit (non-`as const`-literal) interface both
colour objects are typed against — without it, `lightColors` and `darkColors` would infer
their own incompatible literal-string types and couldn't be swapped for each other through a
single `colors` variable.

### Light/dark theme system (`apps/mobile/src/theme/ThemeContext.tsx`)

Mobile has a real theme system as of Phase A (August 2026) — `ThemeProvider` (React Context)
holds the active theme name (`'light' | 'dark'`) and resolves it to `lightColors` or
`darkColors`; `useTheme()` returns `{ theme, colors }`. **Dark is the default and only active
theme today** — there's no persistence and no user-facing toggle yet (no Settings screen exists
to host one); the active theme is a hardcoded constant inside `ThemeContext.tsx`.
`ThemeProvider` wraps the app in the root `_layout.tsx`, inside the Redux `<Provider>`.

Every component that reads `colors` calls `const { colors } = useTheme()` instead of a static
import — `colors` is no longer exported from `packages/shared` (only `lightColors`/`darkColors`
are). Since `useTheme()` is a hook, any `StyleSheet.create({...})` that references `colors` can
no longer live at module scope — the convention across the codebase is a `createStyles(colors)`
function defined below the component, called as `const styles = createStyles(colors);` inside
the component body (not memoized — `StyleSheet.create` is cheap enough to call per-render, and
memoizing it everywhere would add a `useMemo` import + dependency array to ~40 files for no
measurable benefit at this scale). Any module-scope `Record<Status, {...}>` style lookup table
that referenced `colors` (e.g. `RoadmapNodeCard`'s status-badge colours) became a
`getXStyles(colors)` function for the same reason.

`ScreenBackground.tsx` picks its wallpaper by `theme` — `ASSETS.wallpapers.portraitLight` /
`portraitDark`. **Both are placeholder values today** (`packages/shared/constants/assets.ts`),
not real GCS URLs — the light/dark wallpapers are designed in Figma but haven't been exported
and uploaded to GCS yet. `ImageBackground` fails silently on an invalid `uri` (no broken-image
icon like on web), so the screen still shows a flat `colors.background` fill in the meantime.
Replace both constants with real `wallpapers/9x16/...` GCS URLs once uploaded.

### Base UI primitives (`apps/mobile/src/components/`)

Every primitive reads exclusively from `theme.ts` (via `useTheme()`) — no hardcoded hex codes in
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

### Dark mode

Built as of Phase A (August 2026) — see "Light/dark theme system" above. `darkColors` exists in
`theme.ts` and is the active default; `IPreferences.theme` still has no persistence/toggle
wiring to it, and web hasn't adopted a theme system at all (still hardcoded Tailwind classes
per `docs/design/brand-guide.md`'s light-only design).

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
  quiz/[itemId].tsx                    # Full-screen quiz-taking route — see below
```

**As of the Course & Topic redesign, Phase C (August 2026)**, `course/[courseSlug]/lesson/
[lessonId].tsx` no longer exists — a lesson is now opened as `LessonModal`, a modal rendered
directly on the Course screen, not a route. See "Course & Topic redesign, Phase C" below.

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
- `expo-video` (~57.0.2) — Lesson `video` resources (`VideoView`/`useVideoPlayer`);
  every seeded Lesson today is a video intro. Not `expo-av` (deprecated). See
  "Lesson video: deferred buffering" below for the tap-to-load/loading/error
  treatment added later.
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

**Root layout gotcha found during on-device verification**: the app was
launching directly into the quiz screen on cold start — skipping
`index.tsx`'s auth redirect entirely — no matter how the cache was cleared
or the app relaunched, on both an emulator and a physical device. Root
cause: React Navigation's Stack defaults `initialRouteName` to the *first
registered screen* when it isn't set explicitly, and `quiz/[itemId]` was
the only **explicitly** declared `<Stack.Screen>` child of the root
`<Stack>` — every other route is auto-discovered from the file system, but
that one explicit child was implicitly winning the "first screen" slot and
being treated as the whole app's initial route. Fixed by adding
`initialRouteName="index"` to the root `<Stack>`. This one config gap
produced a confusing, hard-to-diagnose symptom (looked at various points
like a native crash, a memory issue, and a gesture-handler incompatibility,
none of which it was) purely because the app never reached the screen it
was actually supposed to start on. Worth remembering for any future root
`<Stack>` that mixes explicit `<Stack.Screen>` overrides with auto-
discovered file routes — set `initialRouteName` explicitly, don't rely on
registration order.

Once that was fixed, the app correctly landed back on the login/home
screen on cold start on both an Android emulator and a physical device.
The full Home → Subject → Course → node → quiz item flow, including the
`dnd_single` drag interaction, still needs to be walked end-to-end per
Phase 5 of the mobile roadmap/quiz plan — this fix unblocks that testing,
it doesn't substitute for it.

## Question types 14–20 & Dictionary quiz (Prompt 2, July 2026)

Prompt 2 of the 5-prompt roadmap (see below). Three of the remaining 8
question types now have renderers — `mcq_audio`, `dnd_build`, `dnd_count` —
plus a second quiz entry point: Dictionary's "Take Quiz" button. `dnd_select`,
`dnd_sort`, `dnd_sequence`, `dnd_match`, and `dnd_fill` are still unbuilt.

### Why only 3 of the remaining 8 types

Of the 8 types without a renderer after Prompt 1, only `mcq_audio`,
`dnd_build`, and `dnd_count` back any seeded content anywhere in the app
(English/isiZulu phonics Node 2s, the Math counting node). The other 5 are
defined in the type system but back zero seeded questions — building
renderers for them now would be speculative, with nothing real to test
against. This mirrors web's own current scope exactly (web has never built
renderers for any of the 8 either), rather than mobile getting ahead of a
shared design that doesn't exist yet.

### Dictionary "Take Quiz" — no new question types needed

Checked what Dictionary's quiz actually needs before building anything: the
Dictionary's default Quiz (`General Dictionary Quiz`, `mode: 'dynamic'`,
seeded in `seed/seeders/quizzes.seed.ts`) draws only from the auto/AI
generation pipeline's own output — 12 question types, all already supported
since Prompt 1 (`mcq_audio` and every `dnd_*` type are absent from both the
auto and AI generator's type lists in root `CLAUDE.md`'s "Question
Generation System" section — you can't auto-generate drag illustrations or
curated audio from an arbitrary dictionary lookup). So Dictionary parity
needed no new question types, just a new session-start path reusing the
existing quiz engine. No backend changes were needed either —
`POST /quiz/session` and `GET /quiz/has-content` already existed and already
return the shapes the mobile client needs.

**Session-start path**: `quizSlice.ts` gained `startMiniAppQuizSession`
(`POST /quiz/session` with `{ miniAppId }`, no settings — mobile doesn't
port web's `QuizStartScreen` customize flow, it starts directly against the
Quiz's own authored settings, same as tapping web's "Start Quiz" default
button). It returns the identical `{ session, firstQuestion }` shape
`startQuizItemSession` already did, so both thunks share one set of
`pending`/`fulfilled`/`rejected` reducers via `isAnyOf` matchers. Note for
future editors: RTK requires every `addMatcher` call to come after all
`addCase` calls in the builder chain — the matchers live at the end of
`extraReducers`, not interleaved next to the thunks they mirror, or it's a
type error, not just a style choice.

**Shared screen, two thin route wrappers**: the session-lifecycle/question-
rendering UI that used to live directly inline in `app/quiz/[itemId].tsx` is
now `src/components/quiz/QuizSessionScreen.tsx`, taking a discriminated
`session` prop:

```ts
type QuizSessionSource =
  | { source: 'roadmapItem'; nodeId: string; itemId: string; subjectSlug: string; courseSlug: string }
  | { source: 'miniApp'; miniAppId: string; title?: string };
```

`roadmapItem` drives the existing roadmap item-complete + auto-advance-to-
next-item flow unchanged. `miniApp` just finishes the session and shows
results — no roadmap progress to update, and no `hasContent` pre-check
needed for `roadmapItem` (a roadmap quiz item's questions are curated for
that node; only `miniApp` runs the fail-open `GET /quiz/has-content` check,
mirroring `apps/web/src/pages/QuizPage/QuizPage.tsx`'s behavior exactly —
resolving `false` shows web's same "No words to quiz yet" empty state, any
fetch error fails open and lets the start attempt try anyway). Both
`app/quiz/[itemId].tsx` and the new `app/quiz/dictionary/[miniAppId].tsx`
are now thin wrappers rendering `QuizSessionScreen` with the appropriate
`session` prop — both stay root-level routes (siblings of `(app)`), both
need an explicit `<Stack.Screen>` entry in the root `_layout.tsx` for
`presentation: 'fullScreenModal'` (see "Root layout: `<Slot/>` -> `<Stack/>`"
above; the `initialRouteName="index"` fix from Prompt 1 already covers any
number of explicit `Stack.Screen` children, so adding a second one needed no
further change there).

`QuizResults.tsx` generalized its return button from a roadmap-specific
`onReturnToRoadmap` to `onReturn`/`returnLabel` (default `'Back to
roadmap'`) — mirrors web's own `QuizResults.tsx`, which already has this
exact `onReturnToDictionary`/`returnLabel` shape. The Dictionary quiz route
uses `returnLabel="Back to Dictionary"` and `router.back()`; the roadmap
route keeps its existing `router.replace(...)` back to the course page.

The Dictionary mini-app screen (`app/(app)/miniapp/[miniAppId]/index.tsx`)
gained a "Take Quiz" button (Sparkles icon, matching web's
`DictionaryPage.tsx`) next to the existing "My Bucket" button, navigating to
`/quiz/dictionary/[miniAppId]`.

### mcq_audio

Not a new interaction pattern — `McqPattern.tsx`'s existing options-list UI,
plus an audio-prompt affordance. Reuses the "audio:" prefix convention
`TypedInputPattern.tsx` already built for `text_input_audio`, but simpler:
`mcq_audio` is exclusively hand-curated seed content (confirmed against the
generation pipeline — never auto-generated), so it always follows the
"audio:" prefix on `content.prompt` with no `termId`-based fallback fetch to
port (that fallback exists on `TypedInputPattern` only because the
auto-generator doesn't tag `text_input_audio`'s prompt the same way —
`mcq_audio` has nothing to fall back to). Added to `QuestionRenderer.tsx`'s
`MCQ_TYPES` set — same options-selection UI as the rest of that group.

### dnd_build and dnd_count — extending the dnd_single gesture foundation

Both new patterns build on the exact same `Gesture.Pan()`/`Gesture.Tap()`
race and `measureInWindow()` hit-testing `DndSinglePattern.tsx` established
in Prompt 1 (see "DnD (dnd_single)" above) — not a rewrite. The shared
draggable-tile primitive (gesture handling, `snapBack`, tap-vs-drag race)
was extracted to `src/components/quiz/patterns/DndTile.tsx` so both new
patterns reuse it instead of re-implementing the same worklet/`runOnJS`
recipe twice; `DndSinglePattern.tsx` itself was left untouched (Phase 0
found no bug to justify touching it — see below) and still owns its own
local tile component.

Two real behavioral differences from `dnd_single`, common to both new
patterns — not just "more zones":

- **Submit timing.** `dnd_single` submits the instant its one slot fills —
  there's only one drop to wait for. `dnd_build` waits until every blank
  (`content.dropZones[]`, one per letter/syllable position) is occupied
  before ever calling `onAnswer`; a half-built word can't be graded.
  `dnd_count` has no autoSubmit at all (see below).
- **Per-blank/per-item correction.** `dnd_single`'s one placed tile can be a
  permanent, non-draggable (but still tap-for-audio) display, because
  `autoSubmit` fires the instant it lands. Neither new pattern can assume
  that: `dnd_build`'s seeded content (CVC words, isiZulu syllables) sets
  `retryUntilCorrect: false`, so a wrong letter *can* sit in a blank —
  tapping a filled blank removes it back to the pool. `dnd_count` needs the
  same correction for a miscounted basket. Both reuse `DndTile`'s
  `draggable={false}` + `onTap`-as-remove for this, the one piece of shared
  behavior worth factoring out (`DndTile.tsx`'s module comment explains why
  this differs from `dnd_single`'s tile, which never needed removal).

**`dnd_build`** (`content.sentenceTemplate` + one `dropZones[]` entry per
blank position, built from `content.draggables` letters/syllables):
`evaluateDnDAnswer` on the API side grades this with the identical "set
equality per zone" branch as `dnd_single`, just across N zones — confirmed
by reading `quizSession.service.ts` directly rather than assuming
`content.blanks[]` (which carries the same position/correctDraggableId
pairing) was what grading actually used. `content.dropZones[]` alone is
sufficient to render and grade; `content.blanks[]` isn't read by this
pattern. `helpers.retryUntilCorrect`, where a future question sets it, still
applies per-blank exactly like `dnd_single`: a wrong tile is rejected at
drop time (bounce + `tryAgain` feedback) rather than ever landing in the
blank.

**`dnd_count`** (one `dropZones[]` entry with `requiredCount`,
`content.draggables` carrying one entry per item *type* with a `quantity` —
how many individual copies exist in the pool): each type is expanded into
`quantity` individual tile instances client-side (a rendered tile needs a
unique id; the underlying type id is kept alongside as `typeId` and is what
actually goes into the submitted `rawResponse`, since
`zone.requiredDraggableIds` checks against the type id, not a per-instance
one). No `autoSubmit` — there's no single "landing" moment the way
`dnd_single` has one, so this pattern always shows an explicit Submit button
(enabled once at least one item is placed) and doesn't read
`helpers.autoSubmit` at all, even though
`seed/questions/math/counting.questions.ts` sets that field per-question
(`true` for counts 1–5, `false` from 6 onward, specifically to force
deliberate confirmation on the harder questions). This is a deliberate v1
simplification, not an oversight: there's no per-drop "did this just
complete the count" moment to hang an auto-submit off of without
re-litigating a check the current UI model doesn't do per-drop.
`helpers.countingAudio` ("counts aloud as items drop into zone") also has no
effect yet — no live TTS/number-speech exists on mobile until Prompt 3 — a
running "N placed" text label substitutes as the visual equivalent for now.
Correctness for both is resolved server-side on submit, same as every other
non-`autoSubmit` pattern in this app.

### Phase 0 — dnd_single on-device verification

Prompt 1 shipped `dnd_single` verified only via `tsc` and a clean
`expo export` bundle, with the actual gesture interaction (drag
registering, the tap-vs-drag race, correct/wrong drop handling) explicitly
unconfirmed on a real device or emulator — flagged as a real risk before
extending that same foundation to two more patterns. Resolved this prompt:
**confirmed working on a physical device** (drag-and-drop registers
correctly, tap-vs-drag race resolves as intended). No bug turned up, so
`DndSinglePattern.tsx` was left completely unmodified — `dnd_build`/
`dnd_count` extend its gesture recipe (via the newly extracted
`DndTile.tsx`) rather than patching anything in it.

### 5-prompt roadmap

This is prompt 1 of 5 for finishing the learner-facing mobile app (Studio,
`apps/web/src/pages/studio/`, stays PC-only web across all 5 — out of scope
throughout):

1. Course/Roadmap navigation, Lesson player, quiz engine for the first 13
   working question types. **Done** — see "Roadmap, Lesson & Quiz UI" above.
2. Question types 14–20 (the remaining `dnd_*` types + `mcq_audio`), plus
   Dictionary's "Take Quiz" entry point. **Done** (`mcq_audio`, `dnd_build`,
   `dnd_count` — the 5 types with no seeded content are deliberately still
   deferred) — see "Question types 14–20 & Dictionary quiz" above.
3. Live TTS on mobile (the `SpokenText` equivalent). **Done** (no live
   word-highlighting — accepted regression, see "Live TTS (Prompt 3)"
   below) — see that section for full detail.
4. Profile management screens, OAuth on native, forgot/reset-password/
   verify-email screens.
5. Peanuts/XP rewards and test-readiness UI, once their backend services
   exist (both are currently schema-only — see root `CLAUDE.md`).

---

## Live TTS (Prompt 3, July 2026)

Ports web's interim live TTS layer
([docs/content/live-tts-word-highlighting.md](../content/live-tts-word-highlighting.md))
to mobile: question prompts, DnD avatar dialogue, and answer feedback are
now read aloud on demand. Most of this prompt is a faithful port of web's
*rules*, not its library (`react-text-to-speech` wraps the browser Web
Speech API — no RN equivalent). Two pieces have no web reference at all and
are original design: the DnD dialogue/draggable-audio wiring for
`dnd_build`/`dnd_count`, and `dnd_count`'s `countingAudio` — web still only
has `dnd_single` implemented (12 text-based question types + `dnd_single`,
as of this writing) while mobile shipped `dnd_build`/`dnd_count` in Prompt 2.

### Library: `expo-speech`, not `expo-edge-speech`

Both were considered. `expo-edge-speech` wraps Microsoft Edge's cloud TTS
service and does expose word-boundary timing events, which would recover
live word-highlighting — `expo-speech`'s documented API has no usable
equivalent (see "Accepted regression" below). But it's an unofficial,
reverse-engineered wrapper around a consumer browser feature, not a
sanctioned Expo API, and needs network connectivity with no offline path —
too much to take on for an interim measure the team's own plan is to
replace with properly licensed Azure AI Speech once Content Studio can
author pre-generated audio. `expo-speech` mirrors web's own choice: free,
on-device, zero new infrastructure, and the same limitation web already
accepts (`zu-ZA` silently falling back to whatever voice the device has
installed, on top of no live-highlighting parity path here either).

Installed as `expo-speech@~57.0.1` (matches this project's `~57.0.x`
convention for every other Expo module, and is what `npx expo install`
would resolve for SDK 57). No `app.json` plugin entry needed — unlike
`expo-audio`, it declares no native permissions.

### Shared primitives

- **`src/lib/lang.ts`** — `subjectSlugToLangCode()`, a direct port of web's
  version (`'isizulu-hl'` → `'zu-ZA'`, else `'en-US'`). No
  `DEFAULT_TTS_VOICE` equivalent: web forces one named Chrome voice via
  `voiceURI`, but native voice identifiers aren't portable device-to-device
  the same way — mobile just passes `language` and accepts whatever voice
  the OS resolves for it.
- **`src/lib/useSpeak.ts`** — imperative hook mirroring web's `useSpeak`:
  `speak(text)`, `stop()`, `isSpeaking`. `expo-speech`'s
  `Speech.speak(text, { language, onDone, onStopped, onError })` is
  callback-based rather than itself a reactive hook, so `isSpeaking` is
  tracked locally off those callbacks. `Speech.speak()` is wrapped in
  try/catch — an unsupported language/voice fails silently (no-op) instead
  of crashing the question, matching web's silent `zu-ZA` fallback.
- **`src/components/quiz/SpokenText.tsx`** — bound-text component (text +
  tap-to-play/stop speaker icon), wraps `useSpeak` internally, visually
  mirrors web's speaker-icon pattern. Used for every fixed string that
  needs reading (question prompts, feedback text, explanation). DnD
  dialogue instead calls `useSpeak` directly inside each pattern component
  rather than going through `SpokenText` — mirrors web's `DndSinglePattern`,
  which bypasses its own shared component for the same reason (the
  existing Replay button needs to drive `speak`/`stop` itself).

### Accepted regression vs. web: no live word-by-word highlighting

`expo-speech` has no word-boundary callback usable for driving live
highlighting on this SDK. `SpokenText` shows a plain speaker icon with no
in-text highlighting — an accepted interim gap, not a bug (see the
`expo-edge-speech` discussion above for why that gap wasn't papered over
with an unofficial dependency). `IFeedback.highlightWords` stays dormant
here too, exactly as on web — it's scaffolding for a different,
pre-computed highlighting approach, not something to build against now.

### Scope — ported 1:1 from web

| Component | Text | Skip condition |
|---|---|---|
| `McqPattern`, `TrueFalsePattern` | `content.prompt` | `content.prompt` starts with `audio:` |
| `TypedInputPattern` | `content.prompt` | `promptIsAudio` (existing `audio:`-prefix logic) or `type === 'text_input_audio'` (has its own fetched-audio flow) |
| `AnswerFeedback` | `content.explanation` | never — no prerecorded equivalent exists |
| `AnswerFeedback` | `feedback.text` | `feedback.audioUrl` is set (plays that instead) |

`lang` is threaded `QuizSessionScreen` → `QuestionRenderer`/`AnswerFeedback`
→ pattern components, computed once per session (see "Language derivation"
below). `QuestionRendererProps` gained a required `lang: string` field for
this — mirrors web's `QuestionRenderer.tsx`, which already carried one.

### DnD dialogue and draggable audio — ported, with one deliberate divergence

`DndSinglePattern.tsx`, `DndBuildPattern.tsx`, and `DndCountPattern.tsx` each
gained: `audioAvailable` now also true whenever `content.avatar?.dialogue`
exists (previously only `dialogueAudioUrl` counted), and `replayPrompt()`
falls back to `useSpeak(lang).speak(content.avatar.dialogue)` when
`dialogueAudioUrl` is absent.

**Divergence from web:** web's dialogue Replay *always* speaks live,
overriding `dialogueAudioUrl` even when it's set — an explicit product
decision, since word-highlighting during the read-out was judged more
valuable than the prerecorded clip for that one control. Mobile has no
highlighting (see above), so that justification doesn't carry over —
mobile keeps the ordinary "prerecorded wins" rule for dialogue too:
`dialogueAudioUrl` still plays first when present, live TTS only fills the
gap when it's absent. Noted here explicitly since it's a real behavioral
difference from web, not an oversight.

Per-tile draggable audio (tap/drag-start to hear `draggable.label`) got the
same *ordinary* fallback: `item.audioUrl` still wins when set
(phonetically load-bearing content, e.g. isiZulu vowel/consonant
recordings), live TTS of `item.label` fills the gap otherwise.
`DndSinglePattern.tsx` has its own local tile component and gained this
directly in its `playItemAudio` helper. `DndBuildPattern.tsx`/
`DndCountPattern.tsx` share `DndTile.tsx`'s tile primitive, but
`DndTile.tsx` itself wasn't touched — it already delegates the tap outcome
entirely to whatever `onTap`/`onDragStart` callback its caller passes in
(audio for pool tiles, remove-from-zone for placed tiles — a distinction
`DndTile` doesn't itself make). The fallback was added at the call site
instead: each pattern's pool-tile `onTap`/`onDragStart` now points at a
local `playItemAudio` helper (same shape as `DndSinglePattern`'s) instead
of a bare `playAsset(item.audioUrl)`.

### `dnd_count`'s `countingAudio` (new — no web reference)

`IQuestionHelpers.countingAudio` had never been implemented anywhere (web
has no `dnd_count` to implement it against). Implemented in
`handleDropAttempt`: when `helpers.countingAudio` is true, speak the new
placed-count as a bare numeral string (`speak(String(placedInstanceIds.size
+ 1))`) each time a tile successfully lands in the zone — TTS engines
pronounce digits as number words natively, no need to spell out
"one"/"two". The existing "N placed" text label stays alongside this, not
replaced by it — visual and audio reinforcement together. Only fires on
landing, not on removing a tile back to the pool, and stops mattering once
`submittedRef.current` blocks further drop attempts post-submit.

### Language derivation per quiz source

Computed once in `QuizSessionScreen.tsx`:

- **Roadmap-item path** (`session.source === 'roadmapItem'`):
  `subjectSlugToLangCode(session.subjectSlug)` — `subjectSlug` already
  reaches this screen as a route param on every navigation path into
  `quiz/[itemId]` (confirmed across `NodeLessonsPanel.tsx`, the lesson
  player's auto-advance, and `QuizSessionScreen`'s own roadmap-item
  auto-advance).
- **Dictionary path** (`session.source === 'miniApp'`): hardcoded
  `'en-US'`, not plumbed through `quiz/dictionary/[miniAppId].tsx`. Today
  there is exactly one Dictionary mini-app, seeded under the English
  subject — no isiZulu dictionary exists (per the seeded hierarchy in root
  `CLAUDE.md`). A deliberate scoped-down decision, not an oversight —
  revisit if a non-English dictionary is ever seeded.

---

## Lesson video: deferred buffering (Aug 2026)

`LessonVideo.tsx` (`apps/mobile/src/components/lesson/`) no longer connects a source to the
player on mount. Per Expo's own docs, a `VideoPlayer` connected to a `VideoView` starts
buffering even while paused — silently spending mobile data on lessons the learner hasn't
chosen to watch yet, a real cost given the target audience. `useVideoPlayer(null)` now creates
the player with no source; a tappable placeholder card (play icon + caption, styled with
`GlassCard` to match the rest of the app's glassmorphism) is rendered in its place until the
learner taps it, at which point `player.replace(url)` + `player.play()` load the real source and
the `VideoView` is swapped in.

Status is tracked via `useEvent(player, 'statusChange', { status: player.status })` from
`'expo'` (not `'expo-video'`). A spinner overlays the `VideoView` while `status` is `'loading'`;
an inline retry affordance shows if `status` becomes `'error'`. Confirmed against the installed
**expo-video ~57.0.2** type definitions before implementing —
`VideoPlayerStatus` is `'idle' | 'loading' | 'readyToPlay' | 'error'`, and `StatusChangeEventPayload`
carries `{ status, oldStatus?, error? }`; this API has shifted across recent SDK versions, so
don't assume it holds on an upgrade without re-checking. There are also documented real-world
cases (Expo SDK 53+) of `statusChange` getting stuck on `'loading'` and never transitioning to
`'error'` for an unavailable/invalid source, so a 15s defensive timeout (`READY_TIMEOUT_MS`)
after tapping play independently triggers the same retry state if playback hasn't become ready
by then — cleared as soon as a terminal status (`'readyToPlay'` or `'error'`) arrives first.

`resource.url` itself needs no path-resolution call here — Lesson resource urls are full GCS
URLs by convention (see root `CLAUDE.md`'s Question model section and
`docs/design/asset-locations.md`), a deliberate exception to how every other asset reference in
the app stores a relative path.

Web got a much smaller version of the same fix: `LessonPlayerPage.tsx`'s `<video>` element
gained `preload="none"` — browsers already provide their own loading/buffering UI, so no custom
loading/error state was needed there.

---

## Course & Topic redesign, Phase C (August 2026)

Implements the redesigned Course page from Figma (file `OaE5PxSOT5p8Fby7SUpoP7`, node `22:27039`
and its sibling "Resources Modal"/"Lesson Modal" frames). Phases A (dark-mode-as-default theming)
and B (`NodeItemType` `'project'` reserved, `IResource.thumbnailUrl`/`description` added) are
separate, already-shipped phases — see their own CLAUDE.md entries. This phase is a pure
rendering/navigation change: `Roadmap → RoadmapNode → items[]` was already a flat, ordered
structure (`packages/shared/types/roadmap.ts`) — there was no separate "topic roadmap" to merge,
just a new way of drawing the existing data.

### Flattened path, not one card/circle per node

`RoadmapPath.tsx` was rewritten to render one `NodeButton` per **item** across every node in
position order, instead of one `RoadmapNodeCard`/`RoadmapNodeCircle` per node (both deleted — see
below). Each node's title is inserted as a non-tappable section banner at the start of its run of
items, matching Figma's "Learn the Vowels: Introduction" banner style. A node-level "N stars"
summary (three `Star` icons, filled 0–3) renders once after a completed node's last item —
`INodeProgressEntry.stars` is node-level data, not per-item, so this lives in `RoadmapPath.tsx`
itself, not in `NodeButton`. Figma's mockup has no connecting line/road between buttons (unlike
the pre-redesign winding SVG path), so none is drawn — just floating buttons and banners. The
buttons still wind gently left-right (alternating x-position by flat item index, not by node
index), approximating Figma's gentler wiggle with the same two-offset alternation the old
`buildWindingPath` used, just tuned to a smaller amplitude — Figma's own button placement looks
hand-adjusted per instance, not derivable as an exact formula from 5 sample points, and the task
this shipped from was explicit that "exact values" applied to the node-button's own geometry/
colours, not the path's overall curve.

**No separate Adult-mode Course page exists in Figma** — only Light/Dark theme variants of the
one flat-path layout (`Landing Page / Plain / Light`, `Landing Page / Plain / Dark`). This settled
a design question left open going in: both `RoadmapNodeCard.tsx` (the old adult/teen horizontal
card list) and `RoadmapNodeCircle.tsx` (the old child-only winding circle) are deleted, not just
one of them — `RoadmapPath` no longer takes an `ageGroup` prop at all.

### `NodeButton.tsx` (`src/components/roadmap/`, new)

Two independent variant axes, ported from Figma's "Node Button" component:

- **Progress** (`'locked' | 'current' | 'completed'`) — drives dimming/ring, not colour. `locked`
  dims the badge and shows a `Lock` icon; `current` (covers both `ItemStatus` `'unlocked'` and
  `'in_progress'`) adds a `colors.primary.light` ring, carried over from the retired
  `RoadmapNodeCircle.tsx`'s own convention; `completed` adds a small fixed 3-star sparkle
  cluster (decorative flourish, not a 0–3 rating — see above). **Figma's mockup has every item
  already completed** — no locked/current instance exists there to sample exact values from, so
  those two treatments are inherited from the pre-existing app convention, not pulled from Figma.
- **Content** (`'lesson' | 'quiz'` — no `'project'` branch; still reserved-only per Phase B) —
  drives the badge's two-tone colour and icon glyph, confirmed against Figma: lesson uses
  `colors.error.dark`/`colors.error.DEFAULT` (rose), quiz uses `colors.primary.dark`/
  `colors.primary.DEFAULT` (violet) — these are exactly the theme's existing tokens, no new hex
  values were needed.

No real Figma vector icon assets were pulled in (Figma's icons are custom SVG illustrations, e.g.
`board-svgrepo-com`/`quiz-svgrepo-com`) — every other icon in this app's roadmap UI already comes
from `lucide-react-native` (`Lock`, `Star`, `ChevronRight`, `Play`, `CheckCircle`), so the closest
lucide glyphs (`MonitorPlay` for lesson, `ClipboardCheck` for quiz) are used here too, instead of
standing up a new bundled-illustration pipeline for two icons.

### `LessonModal.tsx` and `ResourcesModal.tsx` (`src/components/course/`, new)

Tapping a lesson item now opens `LessonModal` — a ~90%-height bottom sheet, not a route — instead
of navigating to the old `lesson/[lessonId].tsx` player (deleted, along with `NodeLessonsPanel.tsx`,
the old node-tap bottom sheet it replaced). Tapping a quiz item is **unchanged** — still navigates
straight to `/quiz/[itemId]` exactly as before; this phase only changed how a quiz item is
*reached*, not the quiz-taking experience itself.

Both modals share the same Videos/Notes tab structure from Figma:

- **Videos tab** reuses `LessonVideo.tsx` (extended with two new optional props,
  `thumbnailUrl`/`description` — Phase B's `IResource` fields — shown as the deferred-buffering
  placeholder's background image and title/description text). The placeholder itself was
  rebuilt on a plain `View` instead of `GlassCard`: `GlassCard`'s centering relies on its
  `content` wrapper shrink-wrapping its children, which breaks once a full-bleed thumbnail
  `Image` is added as a child (the image would only cover the shrink-wrapped box, not the whole
  card) — switching to a directly-sized `View` (matching `videoBox`'s existing aspectRatio+
  overflow treatment) avoids fighting that layout assumption. This is a **behavior-preserving**
  extension — the deferred-buffering/tap-to-load/retry logic that mobile-data-guards video
  playback (see "Lesson video: deferred buffering" above) is completely untouched.
- **Notes tab is a placeholder only** — "No available notes for this lesson." plus a disabled
  "Add notes" button. Figma only designed the Videos state for this modal; a real notes UI and
  its authoring path are out of scope here, not an oversight.

`LessonModal`'s "Mark As Completed" button (violet/`colors.primary.dark`, the exact colour pulled
from Figma's `Primary Button` component) posts to the same `/roadmap/lesson/:lessonId/study`
endpoint the old lesson screen used. **On success it closes the modal and returns to the path**,
rather than auto-advancing into the next item's modal the way the old lesson screen auto-advanced
to the next route after a 1.5s pause — the whole path is visible on one screen now, so the learner
taps the next unlocked node themselves. `CourseScreen` re-fetches the roadmap
(`fetchRoadmapByCourse`) on completion so the just-completed item's `NodeButton` updates without
a manual pull-to-refresh.

`ResourcesModal` aggregates every lesson's video resources across the **whole course**, grouped by
node title as a section header ("Lesson Content: {node title}"). This reads directly off
`RoadmapWithProgress.nodes[].items[].lesson.resources` — already fully populated by
`GET /roadmap/course/:courseId` (confirmed by reading `roadmap.service.ts`'s `resolveNodeItems`
directly: it does an unfiltered `Lesson.find(...)`, not a `.select()`-restricted one) — so no new
API call was needed. There is no teacher-added supplementary resource data yet; that (plus its
Studio authoring UI) is separate, later, web-side work.

### `CoursePathActions.tsx` (`src/components/roadmap/`, new)

Three floating action buttons pinned to the bottom of the Course screen, ported from Figma's
"Course Button" component: two stacked bottom-left, one bottom-right. **Resources** (rose/`error`
colours) opens `ResourcesModal`. **Quizzes** (violet/`primary`) and **Mini-apps** (a fixed dark/
cream pair, `#1f2937`/`#fcfded` — lifted directly from Figma rather than mapped onto a semantic
theme pair, since neither swaps with light/dark theme in the reference) both open a "Coming soon"
placeholder, matching the existing Dictionary mini-app placeholder pattern
(`app/(app)/miniapp/[miniAppId]/index.tsx`) — the quiz-modes screen these will eventually open is
a separate, not-yet-built design.

**Note on Figma's own variant naming**: the Resources button's underlying component variant is
literally named `"Lesson"` (the component's default variant, not `"Resources"`) — this was
confirmed by its position and icon (a monitor/video-content glyph) sitting alongside the
unambiguous `"Quiz"` and `"MiniApp"` variants, not assumed from the variant's name alone, per the
explicit instruction to verify rather than guess which icon maps to which button.

### Verification status

Verified via `tsc --noEmit` (clean) and a clean `expo export --platform android` bundle (3912
modules, no errors) — **not yet confirmed on a real device or emulator**, consistent with this
doc's established practice of flagging what device/emulator testing hasn't covered yet (see the
`dnd_single` gesture work above, which shipped the same way and was confirmed working one prompt
later).

---

## Shared Menubar + select-profile dark-mode fix (August 2026)

`src/components/Menubar.tsx` (new) ports Figma's "Menubar" component — the same frame pulled
during Phase C's research (file `OaE5PxSOT5p8Fby7SUpoP7`, node `22:27039`'s `Stack > Menubar`):
a back chevron + all-caps label on the left, and a Peanuts / XP / profile-avatar cluster on the
right. It replaces the bespoke back-button row every one of these screens previously rolled on
its own: Course screen, Subject screen, Dictionary home, term detail, and Bucket.

Figma's back-button label ("SUBJECT") is set via a decorative font (Chewy) this app doesn't load —
`textTransform: 'uppercase'` on the existing system-font style reproduces the visual effect
without adding a new font asset, so every call site keeps passing its natural-case label
(`subjectName`, `fieldName`, `"Home"`, `"Back to search"`, etc.) unchanged.

**Peanuts and XP are fixed placeholders** (`'0'`, via `Nut`/`Gem` from `lucide-react-native`) —
not wired to any real data, since the reward system is schema-only (no service layer yet — see
root CLAUDE.md's "XP and peanuts reward system" note). **The profile avatar is not a
placeholder** — it reads `state.auth.activeProfile.displayName` directly and renders initials,
the same small helper `select-profile.tsx`'s `ProfileTile` already used, since that data already
exists and showing a fake avatar there would be strictly worse than showing the real one.

Dictionary home's "Take Quiz"/"My Bucket" buttons previously lived inside the same row as the old
back button; they moved to their own row directly below `Menubar` — `Menubar`'s right side is
reserved for the Peanuts/XP/avatar cluster, not arbitrary per-screen action buttons.

### select-profile.tsx dark-mode fix

Found while working in this area: the PIN-entry modal's card and the profile-tile grid both had
`backgroundColor: '#fff'` hardcoded — left over from before the Phase A theme conversion (every
other colour in that file already goes through `useTheme()`, these two literals were missed).
In dark mode this rendered `colors.text.primary` (cream, `#fcfded` — a very slightly yellow-
tinted white) against a hardcoded white card, which read as washed-out, barely-visible "white and
yellow" text. Both now use `colors.background`, matching the rest of the app's solid-card
convention.

---

## What's deliberately not here yet

- **5 of the remaining 8 `dnd_*` question types** — `dnd_select`, `dnd_sort`,
  `dnd_sequence`, `dnd_match`, `dnd_fill` show the same placeholder web shows
  for them. No seeded content exists for any of the 5 yet (matches web's own
  scope) — not slated on the current 5-prompt roadmap; revisit only if/when
  content gets authored for them.
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

---

## Quiz Modes (mobile + backend + Content Studio) (August 2026)

A pre-quiz flow: tapping "Take Quiz" (Dictionary), a quiz item on the Course path, or the Course
screen's "Quizzes" FAB opens a **Quiz Mode Select** screen (a grid of 7 mode cards — Classic/
Hearts/Time Run/Streak/Perfect/Endless/Survival) before the existing quiz-taking flow. Shipped in
two passes:

1. **UI/UX only** — the grid, settings modal, and navigation wiring, with zero gameplay effect
   (every mode started the same unmodified session).
2. **Real gameplay + question sourcing** — this entry now describes the finished feature. Two
   independent, orthogonal changes made it real:
   - **Where questions come from** (backend): a new `Quiz.mode: 'pool'` so every game mode can
     draw from one flat pool of course questions, authored directly in Content Studio.
   - **How the session plays out** (mobile-only, universal): hearts/timer/streak/mistake-limit/
     perfect-run rules, applying the same way whether the underlying quiz is a curated roadmap
     lesson or a course's pool.

### Naming: `QuizPlayMode`, not `QuizMode`

`QuizMode` already exists (`packages/shared/types/quiz.ts`, `'dynamic' | 'fixed'`) and describes
how a Quiz's *content* is sourced — a different axis entirely from "which game the player wants
to play." The new catalog type is **`QuizPlayModeId`** (`src/components/quiz/quizPlayModes.ts`,
mobile-local — see below) specifically to avoid colliding with it. See
`docs/technical/data-models.md`'s `QuizSession` entry for the cross-reference on the backend
side.

### New files

- `src/components/quiz/quizPlayModes.ts` — the mode catalog (id, label, blurb, icon, which
  mode-specific setting it exposes, default settings) and `QuizPlayModeSettings`. Mobile-local
  rather than `packages/shared` because it carries `lucide-react-native` icon components, which
  the shared package (plain TS, no JSX/RN deps) can't hold. Purely additive — doesn't touch
  `IQuiz`/`QuizSettings`/`IQuizSession`.
- `src/components/quiz/QuizModeSelectScreen.tsx` — the grid screen. Reuses `Menubar` for the
  back button + peanuts/XP/avatar cluster (this already existed as of the Shared Menubar entry
  above — an earlier version of this task's brief assumed no stats header existed anywhere in
  mobile yet and asked for one to be built fresh; that assumption was stale by the time this
  landed, so `Menubar` is reused as-is, unmodified).
- `src/components/quiz/QuizModeCard.tsx` — one grid card, built on `GlassCard`. Shows a settings
  pill when the mode has an adjustable setting.
- `src/components/quiz/QuizSettingsModal.tsx` — centered dialog (adapts `LessonModal`/
  `ResourcesModal`'s `Modal` + backdrop-`Pressable` interaction pattern to `animationType:
  'fade'` and a centered layout instead of their bottom-sheet `'slide'`). Local component state
  only. "Start Quiz" both saves the draft settings back to the card (so the pill updates) and
  starts the session in one action.
- `src/components/course/QuizPickerModal.tsx` — opened from the Course screen's "Quizzes" FAB
  (`CoursePathActions`), which previously had no real destination ("Coming soon" — see the
  Course & Topic redesign, Phase C entry above). Two tabs, same Videos/Notes structure as
  `ResourcesModal`: **Course Quizzes** lists every quiz-type item across the course's nodes
  (same course-wide aggregation shape as `ResourcesModal`'s video grouping) and hands off to the
  *same* Quiz Mode Select route a direct on-path quiz-item tap would; **Game Quizzes** embeds
  the mode grid directly in the tab, targeting `{source:'miniApp', miniAppId: courseId}` — the
  course's own auto-created pool quiz (see "Question sourcing" below), the same shape
  Dictionary's "Take Quiz" already used, just pointed at the course. Since the grid *is* already
  the mode-select step, starting from here goes straight to `/quiz/dictionary/[miniAppId]` (the
  session route), not back through `/quiz/modes/[itemId]`. An earlier version of this tab
  quick-played the course's first roadmap quiz item (`findFirstQuizItem`) as a workaround before
  the pool existed — deleted once there was a real target to point at.
- `src/components/quiz/QuizModeGrid.tsx` — the 7-card grid + `QuizSettingsModal` wiring,
  extracted out of `QuizModeSelectScreen` so both it and `QuizPickerModal`'s Game Quizzes tab
  share one implementation. Plain `flexWrap` layout, not `FlatList` — nesting a `FlatList`
  inside `QuizPickerModal`'s `ScrollView` would be the classic "VirtualizedList inside a
  ScrollView of the same orientation" RN anti-pattern, and virtualizing 7 fixed items buys
  nothing anyway.
- `app/quiz/modes/[itemId].tsx`, `app/quiz/modes/dictionary/[miniAppId].tsx` — new root-level
  sibling routes, registered in `app/_layout.tsx`'s `<Stack>` exactly like the two existing quiz
  routes (`presentation: 'fullScreenModal'`). **Deliberately additive, not a restructure** — the
  existing `quiz/[itemId]` / `quiz/dictionary/[miniAppId]` routes and their registrations are
  untouched, given this doc's own documented fragility around `initialRouteName` and
  `fullScreenModal` (§1.7 of `mobile-screens-and-navigation.md`). Mode-select simply sits ahead
  of them in the flow and `router.replace()`s into the unchanged session route on start.

### Question sourcing: `Quiz.mode: 'pool'`

A new third `QuizMode` (alongside `'dynamic'`/`'fixed'` — `packages/shared/types/quiz.ts` +
`quiz.model.ts`'s Mongoose enum, both updated, same "two declarations" pattern as `NodeItemType`
gaining `'project'` in Phase B). `createQuizSession`'s branch in `quizSession.service.ts` gained
a `selectPoolQuestions(miniAppId, settings)` helper: `Question.find({ miniAppId, isActive: true,
...(questionTypes filter) })`, shuffled, then sliced to `settings.questionCount` — mirrors
`studio/question.service.ts`'s `listQuestions` query shape exactly (same index-backed
`{miniAppId, isActive}` filter). No bucket, no pinned list.

One `isDefault: true, mode: 'pool'` Quiz (titled `"{Course} Practice Pool"`,
`isUserAdjustable: true`, `settings.questionCount: 200`) is auto-created per Course —
`studio/course.service.ts`'s `createCourse` already created the Course's empty Roadmap in the
same request, so the pool quiz is created right alongside it (rolled back together on failure).
Existing courses (created before this shipped) are backfilled by
`apps/api/src/seed/migrations/2026-08-quiz-modes-pool.ts` (`pnpm --filter api
migrate:quiz-modes-pool`) — check-before-write, safe to re-run.

This is what makes "every game mode draws from one pool of course questions, added by the
teacher in Content Studio" real end-to-end: `POST /api/dashboard/questions { courseId, ... }`
(no `nodeId`/`quizId`) already supported creating a question scoped to a course without
attaching it to any Quiz — the missing pieces were a session-sourcing mode that could actually
*serve* those unattached questions, and a Studio UI to reach question creation without going
through a specific Quiz's "+ Add Question" modal (now the Question Bank section on
`CourseDetailPage.tsx` — see the Content Studio design doc). `quiz.service.ts`'s
`hasQuizContent` needed an explicit third branch too — it previously treated any non-`'fixed'`
mode as `'dynamic'` (a bucket check), which would have silently reported `false` for every pool
quiz once that mode existed.

Mobile's Game Quizzes tab (`QuizPickerModal`) now targets this pool directly
(`{source:'miniApp', miniAppId: courseId}`) instead of quick-playing a roadmap item — see its
entry above.

**v1 simplification, not a bug**: there's no "give me the whole pool" query — count-bound modes
(Classic, Perfect) request their chosen count; open-ended modes (Hearts, Streak, Endless,
Survival, Time Run) request a large sentinel (`OPEN_ENDED_QUESTION_COUNT = 200` in
`quizPlayModes.ts`, matching the pool quiz's own default `questionCount`), which naturally caps
at however many questions actually exist. A course with a small pool just runs out of questions
(the existing `sessionComplete` flag fires) rather than cycling — a real future improvement once
pools are large enough for it to matter.

### Gameplay mechanics — universal, client-side only

Hearts/Time Run/Streak/Perfect/Endless/Survival's rules live entirely in
`QuizSessionScreen.tsx`, applying the same way regardless of `session.source` — a curated
roadmap-lesson quiz played in Hearts mode really does end at 0 lives, not just a course's pool
quiz. This works because `completeSession` (`quizSession.service.ts`) already supported ending a
session early: `SessionResults` are computed from actually-answered `AnswerRecord`s, not from the
originally-planned `questionIds.length`, and nothing requires every question to be answered
first. **No backend model change was needed for the mechanics themselves** — only for sourcing
(above).

The chosen mode + its settings cross the mode-select → session-route navigation boundary as one
JSON-encoded `play` param (Expo Router params are strings only) —
`quizPlayModes.ts`'s `encodePlayModeParam`/`parsePlayModeParam`, read by both route wrapper files
(`app/quiz/[itemId].tsx`, `app/quiz/dictionary/[miniAppId].tsx`) into a new optional `playMode`
prop on `QuizSessionScreen`, separate from `session` (which quiz/questions) since play-mode is
orthogonal to sourcing. `toSessionSettingsOverride` maps the subset of `QuizPlayModeSettings`
the backend actually understands (`questionCount`/`timeLimit`/`feedbackMode`/`shuffleQuestions`
— all real `QuizSettings` fields) into the session-create override; **`hearts`/`mistakeLimit`
never reach the API** — they stay purely client-side state, matching the "local-state-only"
principle `quizPlayModes.ts` already established.

Implementation, inside `QuizSessionScreen`:

- A new effect watches `quiz.lastAnswer` and applies the active mode's per-answer rule exactly
  once per answer — hearts/mistakes/streak must update for `feedbackMode:'immediate'` sessions
  too, not just `'end'` ones, so this can't live inside the existing `feedbackMode==='end'`
  auto-advance effect alone. Treats a skip the same as a wrong answer (`!isCorrect`) for
  Hearts/Perfect/Endless/Streak purposes.
- **The race this design deliberately avoids**: this new effect and the pre-existing
  `feedbackMode==='end'` auto-advance effect both depend on `quiz.lastAnswer`, so both fire in
  the *same* React commit whenever a new answer arrives. If the mode-rule effect (which runs
  first — React fires a component's effects in declaration order) decides the run is over and
  dispatches `completeSession`, the second effect's own closure still holds the pre-dispatch
  `quiz.status`/`quiz.lastAnswer` values (both effects were scheduled from the same render,
  before either ran) — so without a guard, it would *also* fire, dispatching a conflicting
  `advanceQuestion()`/`completeSession()` and potentially undoing the early-end decision. A
  plain state flag can't fix this (same stale-closure problem), so the mode-rule effect writes a
  ref (`endedEarlyRef`, read fresh at call time, not closure-creation time) synchronously before
  dispatching; the second effect checks it first and bails. `handleAdvance` (the immediate-
  feedback manual tap) checks the same ref defensively, though in practice the mode-rule effect
  already moves `quiz.status` away from `'awaiting_advance'` before the user can tap it.
- Time Run runs an independent `setInterval` countdown (via `setTimeLeftMs`'s updater form, so
  the ticking effect never needs to restart on a stale closure), ending the session the instant
  it hits 0 regardless of what question is mid-flight.
- A small in-session HUD (hearts remaining / mistakes so far / streak / time left) renders above
  `QuizProgress` — omitted entirely for Classic/Perfect, which have nothing worth showing
  mid-run.
- `QuizResults.tsx` gained an optional `banner` prop (a single string — "Out of hearts!",
  "Time's up!", "Too many mistakes!", "Perfect run ended.", or Streak's "Best streak: N") —
  `QuizResults` just renders whatever it's given; all the "why did this end" logic stays in
  `QuizSessionScreen`.
- `handleQuizAgain` resets every mode counter (hearts/mistakes/streak/bestStreak/timeLeftMs/
  `endedEarlyRef`) before restarting — otherwise a second playthrough would start already at 0
  hearts.
- Two knock-on fixes in the same file, both real bugs this pass would have shipped otherwise:
  the results screen's `returnLabel` fallback was hardcoded `'Back to Dictionary'` for every
  `source:'miniApp'` session — now `` `Back to ${title}` `` (or `'Back'`), since `miniApp` now
  also means a course's pool quiz. The empty-state copy ("No words to quiz yet… Add a few words
  to your bucket from the Dictionary…") was Dictionary-specific for the same reason — now
  generic ("No questions to quiz yet… Check back once more questions have been added.").

### Mode-grid gating: Topic quizzes are opt-in (correction, August 2026)

The original decision — the mode grid always shows for every quiz, only the settings pill was
gated — turned out to be wrong for `mode: 'fixed'` roadmap/node ("Topic") quizzes: showing a
7-card game-mode picker in front of *every* lesson quiz was too much for content a teacher never
designed as a game. Corrected with a new `Quiz.allowPlayModes` field (default `false`,
`quiz.model.ts` + shared `IQuiz`) — a Topic quiz only shows Quiz Mode Select if a teacher
explicitly turns it on, from a checkbox on `QuizEditorPage.tsx` ("Allow Quiz Modes … for this
quiz on mobile"). Left off, tapping it goes straight into the ordinary session — exactly the
pre-Quiz-Modes behavior.

This is a routing-time decision, made by the caller before ever navigating, not something
`QuizModeSelectScreen` itself checks — so the flag needed to travel with the roadmap data
mobile already has in hand, not a new API call: `IQuizItemSummary` (`packages/shared/types/
roadmap.ts`) gained `allowPlayModes`, populated by `roadmap.service.ts`'s node-item resolution
alongside `questionCount`. `RoadmapPath`'s `onSelectQuiz` callback signature grew a third
`allowPlayModes` argument (read off `item.quiz.allowPlayModes` where it renders each button);
`CourseScreen`'s handler and `QuizPickerModal`'s "Course Quizzes" tab both branch on it —
`allowPlayModes ? '/quiz/modes/[itemId]' : '/quiz/[itemId]'` — the same conditional in both
places, since both are ways of reaching the same underlying Topic quiz.

**Deliberately not read for `mode: 'dynamic'`/`'pool'` quizzes** — Dictionary's "Take Quiz" and
every course's auto-created practice pool ("Game Quizzes") always show the grid regardless of
this flag; those are inherently game surfaces, not curated lesson content a teacher might not
want gamified. No migration was needed for existing Topic quizzes — they simply take the schema
default (`false`), which is the corrected behavior.

**Gotcha hit while wiring this**: `apps/api/src/modules/roadmap/roadmap.types.ts` has its own
backend-local `QuizItemSummary` interface that duplicates the shared `IQuizItemSummary` shape
rather than importing it — both needed the new field, or `roadmap.service.ts`'s object literal
fails to compile with "does not exist in type". Same "two declarations" trap as `QuizMode`
gaining `'pool'` (model enum + shared union) and `NodeItemType` gaining `'project'` (Phase B) —
worth grepping for a type's *other* declaration before assuming one edit is enough.

### Settings-pill gating without a new API call

`Quiz.isUserAdjustable` is what the pill's interactivity follows, per the (still-standing)
product decision: for a quiz whose mode grid is showing at all (see above), the *settings pill*
is only interactive for adjustable quizzes — a non-adjustable quiz's card shows its default
value as a static, non-pressable label instead. Rather than adding a new field to
`IQuizItemSummary`/a new API call, `QuizModeSelectScreen` derives this from which entry point
was used: `target.source === 'miniApp'` stands in for `isUserAdjustable: true`;
`target.source === 'roadmapItem'` stands in for `false`. This correctly covers **both**
adjustable quizzes seeded today — Dictionary's "General Dictionary Quiz" and every course's
auto-created pool quiz (both seeded `isUserAdjustable: true`) — while every roadmap-item quiz
stays non-adjustable. In practice this now only matters for an opted-in Topic quiz (one with
`allowPlayModes: true`) — its grid shows, but the pill stays a static label, since
`isUserAdjustable` and `allowPlayModes` are independent flags. Still a simplification, not a
real flag read — revisit if a roadmap-item quiz is ever seeded `isUserAdjustable: true`.

### Fonts: Chewy + Fredoka (new screens only)

Neither font was loaded anywhere in the app before this. `expo-font` +
`@expo-google-fonts/chewy` + `@expo-google-fonts/fredoka` were added and wired into
`app/_layout.tsx`'s existing splash-hold logic: `useFonts()`'s `[loaded, error]` now gates the
native-splash-to-`LaunchScreen` hand-off alongside `isCheckingAuth`, so the app doesn't render
text in the wrong font for one frame. Chewy (`Chewy_400Regular`) is used sparingly, for the one
big page-level heading per new screen ("Quiz Modes"); Fredoka (400/500/600) covers card titles,
blurbs, pills, and modal body text. This is scoped to the Quiz Modes screens only — not an
app-wide font sweep.

### Theme: dark (the app's current shipped default)

Built against `darkColors` — the theme every other mobile screen actually renders in today (see
"Light/dark theme system" above). `docs/design/brand-guide.md` still states a light-only design
intent ("avoid dark backgrounds"); that's a pre-existing tension between the brand guide and the
shipped Phase A default, not something introduced or resolved here — flagged to Banele rather
than picked silently, since the two docs actively disagree.

### Figma

No node reference was available for the mode-select grid frame at build time — the only
"Landing Page" frame this repo had on record (file `OaE5PxSOT5p8Fby7SUpoP7`, node `22:27039`) is
the unrelated Course-screen path, confirmed by pulling its metadata directly rather than assumed
from the name. `get_metadata` on the file's one listed page (`0:1`, "Cover") returned an empty
canvas with no enumerable children, so there was no safe way to discover a quiz-mode-select node
id without guessing — which the design-to-code skill explicitly disallows. Built instead from
the mechanics table (mode mechanic → suggested setting) plus `theme.ts` tokens. **Revisit the
visual pass once a real node id/link is available** — spacing, colours, and copy here are a
reasonable baseline, not a pulled design.

### A bug found while tracing this flow, not fixed here

`QuizSessionScreen.tsx`'s post-quiz auto-advance still `router.replace()`s to
`.../course/[courseSlug]/lesson/[lessonId]` when the next roadmap item is a lesson. That route
was removed by the Course & Topic redesign, Phase C, in favour of `LessonModal` (a modal over
the Course screen, not a route) — so this specific auto-advance branch is dead code today,
pre-existing and unrelated to Quiz Modes. Not fixed here because the right fix depends on a
product decision this task wasn't scoped to make (e.g. does auto-advance-into-a-lesson still
make sense now that lessons open in a modal rather than a full screen?).

### Verification status

`tsc --noEmit` clean across all three workspaces (`apps/api`, `apps/web`, `apps/mobile`); mobile
`expo export --platform android` clean. **Not yet confirmed on a real device or emulator**, nor
against a real Atlas database — the migration script and the new pool-mode session-creation path
have only been read-reviewed and type-checked, not run end-to-end. Consistent with this doc's
established practice of flagging what hasn't been device/data-tested yet (see the `dnd_single`
and Phase C entries above).

---

## Course Chat (mobile + backend) (August 2026)

A new entry point on the Course screen — a fourth floating action button added to
`CoursePathActions.tsx`'s existing bottom-right FAB stack, directly above the Mini-apps FAB
(same two-tone outer/inner styling as the other three; an emerald/success colour pairing, since
there's no Figma source for this button to match the way the original three came from Figma's
"Course Button" component — see that file's module comment). **Not** placed inline in the Course
screen's header/progress area, where an earlier draft of this feature briefly put it — moved
into the FAB stack per direct feedback once the feature was live. Tapping it opens a hub with two
destinations: **AI Helper** (a 1:1, course-scoped chat with an AI tutor, built fully this pass)
and **Classmates & Teacher** (a visibly-present, disabled placeholder — no teacher accounts or
class/cohort model exist yet; see
[docs/product/course-chat-vision.md](../product/course-chat-vision.md) for the full product
reasoning, including why that half wasn't improvised around the gap).

### Why two ordinary nested routes, not a root-level full-screen modal

Unlike the quiz routes (`quiz/[itemId].tsx` etc.), which are registered at the app root with
`presentation: 'fullScreenModal'` specifically because Expo Router requires modal screens to
live outside the group whose transition they're overriding, Course Chat's two new screens —
`(app)/subject/[subjectSlug]/course/[courseSlug]/chat/index.tsx` (hub) and
`.../chat/ai-helper.tsx` (the chat itself) — are ordinary nested routes inside the `(app)` group.
Being a distinct routed screen (rather than an in-place `<Modal>` like `LessonModal`/
`QuizPickerModal`) already satisfies "full screen, not a modal" without touching the root
`_layout.tsx`'s `<Stack/>` config, which a comment there already flags as fragile around
`initialRouteName`. This is also the first real nested dynamic sub-route under
`course/[courseSlug]/` — everything else at that level (`LessonModal`, `ResourcesModal`,
`QuizPickerModal`) is a modal, not a route, since the Course & Topic redesign, Phase C removed
the one dedicated sub-route (`lesson/[lessonId].tsx`) that used to exist there.

`courseId`/`courseName` are passed as router params directly from the course screen's button
(the same values already in scope there) rather than re-derived from Redux on the hub/chat
screens — simpler than replicating the course screen's `fieldSlug`/`subjectKey`/`course`
derivation chain a second and third time.

### New files

- `src/features/aiChat/aiChatSlice.ts` — mirrors `quizSlice.ts`'s conventions
  (`rejectWithValue` + shared `extractErrorMessage`, string-union status fields). State is keyed
  by `courseId` (`messagesByCourseId: Record<string, IAiChatMessage[]>`) so switching between
  courses never clobbers another course's thread in memory. Two thunks: `fetchChatHistory` (GET)
  and `sendChatMessage` (POST, returns both the persisted user message and the AI's reply in one
  response — see the backend section below for why).
- `src/components/course/CourseChatHubScreen.tsx` — the two-tile hub. The AI Helper tile is a
  live `Pressable` → `GlassCard`; the Classmates & Teacher tile is deliberately **not**
  interactive at all (no `onPress`) — its "🔜 Coming soon" badge and explanatory line are already
  visible on the tile, so there's nothing a tap would reveal that isn't already shown.
- `src/components/course/AiHelperChatScreen.tsx` — the chat itself. Optimistic send: the
  learner's message renders immediately from local `pendingText` state (not Redux) while the
  request is in flight; on success it's cleared and the real `{userMessage, assistantMessage}`
  pair from Redux takes over, on failure it stays with an inline "tap to retry" chip. Threads
  `ageGroup` down from `state.auth.activeProfile` the same way `QuizSessionScreen.tsx` does
  (`isChild = ageGroup === 'child'` → bigger touch targets, `typography.bodyChild` for bubble/
  input text).
- `src/components/course/ChatBubble.tsx` — one message bubble (`GlassCard`-wrapped, aligned by
  `role`), shared by `AiHelperChatScreen`.
- Web mirrors: `apps/web/src/features/aiChat/aiChatSlice.ts`,
  `apps/web/src/pages/course/CourseChatPage.tsx` (hub),
  `apps/web/src/pages/course/CourseChatAiHelperPage.tsx`,
  `apps/web/src/components/chat/ChatBubble.tsx` — same slice shape, same optimistic-send pattern,
  new routes `/subject/:subjectSlug/course/:courseSlug/chat` and `.../chat/ai-helper` in
  `main.tsx`. Unlike mobile, the web pages re-derive `course` from Redux (`coursesByKey`/
  `currentCourse`, with the same direct-link fallback fetch `CoursePage.tsx` already uses) rather
  than receiving it via route params — React Router's `:courseSlug` segment doesn't carry
  arbitrary extra params the way Expo Router's `router.push({ params })` does, and nothing else
  in this app's web routing passes data via `location.state`, so re-deriving keeps this
  consistent with the existing convention rather than introducing a new one.

### Backend (`apps/api`)

- New model `models/learning/aiChatMessage.model.ts` (`profileId`, `courseId`, `role: 'user' |
  'assistant'`, `content`, timestamps) — see the `AiChatMessage` entry in
  [data-models.md](data-models.md) for the full field/index writeup.
- New module `modules/aiChat/` (routes/controller/service/types, same thin-controller pattern as
  `modules/vocab/`), mounted at `/api/ai-chat` in `app.ts`.
- New `services/aiChatHelper.service.ts` — reuses the exact `@anthropic-ai/sdk` /
  `claude-haiku-4-5-20251001` setup from `questionGeneration/aiGenerator.ts`, but wraps the API
  call in a try/catch mapping any failure to a 503 (that call is synchronous/user-facing here,
  unlike `aiGenerator.ts`'s fire-and-forget usage) and uses the SDK's `system` parameter for a
  proper multi-turn shape instead of `aiGenerator.ts`'s single-shot embedded-instructions style.
- **Rate limiting** — a 5s cooldown + 50 messages/day cap, both per-profile (not per-course) and
  derived directly from the `AiChatMessage` collection's own timestamps — no new Redis/counter
  infra, since neither Upstash Redis (configured in `config/redis.ts` but unused anywhere else in
  this codebase) nor a per-user rate limiter had any existing precedent here to build on.
- A send-message turn only persists the user's message and the AI's reply **together**, after
  the Anthropic call succeeds — never a saved user message with no reply, so a failed send can
  just be retried client-side with no orphaned-message cleanup needed.

### Verification status

`tsc --noEmit` clean across `apps/api`/`apps/web`/`apps/mobile`, plus a clean mobile `expo
export --platform android`. **Not yet exercised against a live Anthropic call, a real Atlas
database, or a real device/emulator** — consistent with this doc's established practice of
flagging what hasn't been run end-to-end yet.

---

*Last updated: 2026-08-13.*

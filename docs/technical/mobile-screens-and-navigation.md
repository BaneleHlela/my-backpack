# Mobile App — Screens & Navigation Reference

*Scope: `apps/mobile` only. Written against `main` @ `99e9209` (24 July 2026). This is a reference doc, not a design spec — it explains what exists today so Figma decisions can map cleanly onto the real route tree. Not covered: Content Studio / teacher-dashboard screens, which stay web/desktop-only.*

## Contents

1. [Expo Router, in plain terms](#1-expo-router-in-plain-terms)
2. [The full route tree](#2-the-full-route-tree)
3. [Screen-by-screen reference](#3-screen-by-screen-reference)
4. [Cross-cutting architecture](#4-cross-cutting-architecture)
5. [A note on "Topic"](#5-a-note-on-topic)
6. [Suggested / missing screens](#6-suggested--missing-screens)
7. [Observations for the restyle](#7-observations-for-the-restyle)
8. [Quick-reference table](#8-quick-reference-table)

Section 1 is a routing primer since you're new to React Native — skip it if you just want the screen list. Section 6 is the one you asked for: gaps found while reading the code, not invented wishlist items.

---

## 1. Expo Router, in plain terms

### 1.1 The core idea: files *are* the routes

With plain React Navigation you wire routes by hand — a `<Stack.Navigator>` with `<Stack.Screen name="Home" component={HomeScreen}/>` entries in a JS object. Expo Router (built on top of React Navigation, not a replacement for it) removes that step: every file under `apps/mobile/app/` becomes a route automatically, and the file's path *is* the URL path. `app/(app)/home.tsx` is the screen at `/home`. Same underlying Stack/gesture engine, but you create files instead of writing navigator config.

### 1.2 Route groups: folders in `(parentheses)`

`(auth)` and `(app)` are folders whose names are wrapped in parentheses — Expo Router excludes that segment from the actual URL but still applies the folder's `_layout.tsx` to everything inside it. So `(app)/home.tsx` sits at `/home`, not `/(app)/home`, even though `router.push`/`Link` calls in this codebase still spell it `/(app)/home` for disambiguation (since `select-profile.tsx` and `profile-setup.tsx` sit at the root, outside any group). The entire point of a route group here is to attach shared guard logic to a set of screens without changing their URLs: `(auth)/_layout.tsx` says "logged in? bounce to Home"; `(app)/_layout.tsx` says "not logged in? bounce to Login."

### 1.3 Dynamic segments: `[bracketed]` names

A file or folder named `[subjectSlug]` captures whatever sits in that URL position as a parameter, read inside the component via `useLocalSearchParams<{ subjectSlug: string }>()`. These nest freely — the lesson screen's real path is

```
(app)/subject/[subjectSlug]/course/[courseSlug]/lesson/[lessonId].tsx
```

so that one component receives `subjectSlug`, `courseSlug`, *and* `lessonId` simultaneously.

### 1.4 `_layout.tsx`: three different jobs, one filename

| File | Job |
|---|---|
| `app/_layout.tsx` (root) | Redux `<Provider>`, `GestureHandlerRootView`, the auth-bootstrap effect, and a `<Stack>` — the only place per-screen navigation options get declared |
| `(auth)/_layout.tsx` | Pure guard — reads auth state, renders a `<Redirect>` or a plain `<Stack>` for login/signup |
| `(app)/_layout.tsx` | Guard (via `<ProtectedRoute>`) *plus* shared visual chrome (`<ScreenBackground>`) around a `<Slot/>` |

`<Slot/>` renders whichever child route matches — no transition control, no per-screen options. `<Stack/>` is what actually gives native push/pop transitions and lets you override behaviour per screen via `<Stack.Screen name="..." options={{...}}/>`. The root layout used to be a bare `<Slot/>` until the quiz feature needed a full-screen-modal presentation for one specific route — that's the only reason the whole app now sits inside a `<Stack>`.

### 1.5 Moving between screens — four ways, not interchangeable

- **`router.push({ pathname, params })`** — adds a stack entry; back returns to where you were. Used for anything the learner should be able to back out of: Home → Subject, Subject → Course, tapping a lesson/quiz/term.
- **`router.replace({ pathname, params })`** — swaps the current entry; nothing to back into. Used wherever the app auto-advances without being asked: lesson → next lesson, lesson → quiz, quiz results → Course. If these used `push`, the stack would grow one entry per auto-advance, and back-ing out after five auto-advanced lessons would replay all five in reverse.
- **`router.back()`** — pops to whatever's underneath. Ordinary "go back" buttons.
- **`<Link href="...">`** — declarative `push`, used only for the Login ↔ Signup links.

Worth knowing before a restyle: two screens use `replace()` for what *reads* like an ordinary back action — Dictionary home's "Home" button and Bucket's "Back to Dictionary" button — where every other back button in the app uses `back()`. Not broken, just inconsistent; worth a deliberate choice rather than carrying the drift forward.

### 1.6 Routes that live outside every group

`quiz/[itemId].tsx` and `quiz/dictionary/[miniAppId].tsx` sit at the root of `app/`, siblings of `(app)` and `(auth)`, not nested inside `(app)`. Two reasons: nothing links to them except from already-guarded `(app)` screens, so they don't need their own guard; and sitting outside `(app)` is what lets them declare `presentation: 'fullScreenModal'` on the root `<Stack>` without that option leaking onto anything else. There's no tab bar yet for them to hide behind, which is why root-level was the cleanest option.

Quiz Modes (see §3/§8) added two more root-level siblings the same way: `quiz/modes/[itemId].tsx` and `quiz/modes/dictionary/[miniAppId].tsx`. These are new routes, not a restructure of the two above — both existing routes and their `<Stack.Screen>` registrations are untouched; the new pair sits ahead of them in the flow (mode-select → the existing session route), registered identically in the root `<Stack>` for the same `fullScreenModal` reason.

### 1.7 Two gotchas already paid for once — worth not re-discovering

- **`initialRouteName` is required on the root `<Stack>`.** `quiz/[itemId]` is the only route with an *explicit* `<Stack.Screen>` entry (everything else is auto-discovered from disk) — without `initialRouteName="index"` set explicitly, Expo Router defaults to treating that explicit entry as the first route, and a cold start launches straight into the quiz screen instead of `index.tsx`'s auth redirect. This looked like a crash the first time it happened.
- **Never create a `src/app/` folder.** Expo Router silently prefers `src/app/` over the real project-root `app/` as its routes directory the moment a `src/` folder exists at all. This broke a production export once (the Redux store used to live at `src/app/store.ts`, mirroring web's convention) — it now lives at `src/store/store.ts` specifically to dodge this. Relevant if a restyle ever reorganises `src/`.

### 1.8 Deep linking

`app.json` sets `"scheme": "mybackpack"`, enough for Expo Router to auto-derive a linking config from the file tree — `mybackpack://subject/english-hl` would, in principle, resolve. Nothing beyond the scheme is configured today, and at least one screen explicitly assumes it's never a deep-link entry point (the Course screen expects `coursesByKey` to already be populated by the Subject screen before it — no fallback fetch). Worth knowing if the restyle wants a notification or email link to jump straight into a specific course or lesson.

---

## 2. The full route tree

```mermaid
flowchart TD
    Launch["App launch\nbootstrapAuth()"] --> Guard{ProtectedRoute}
    Guard -->|no token| Login
    Guard -->|partial token| SelectProfile[Select Profile]
    Guard -->|full token, setup incomplete| ProfileSetup[Profile Setup]
    Guard -->|full token, setup complete| Home
    Login -->|success| SelectProfile
    SelectProfile -->|profile chosen| Guard
    ProfileSetup --> Home
    Home --> Subject
    Subject --> Course
    Subject --> Dictionary["Dictionary mini-app"]
    Course -->|tap lesson item| Lesson["LessonModal\n(bottom sheet, see §5)"]
    Course -->|tap quiz item| QuizModes["Quiz Mode Select\n/quiz/modes/[itemId]"]
    Course -->|Quizzes FAB| QuizPicker["QuizPickerModal\n(course-wide quiz list)"]
    QuizPicker -->|pick a quiz| QuizModes
    Course -->|Course Chat button| ChatHub["Course Chat hub\n/chat"]
    ChatHub -->|AI Helper| AiHelper["AI Helper chat\n/chat/ai-helper"]
    ChatHub -.->|Classmates & Teacher\n(disabled, coming soon)| ChatHub
    QuizModes -->|start a mode| Quiz
    Lesson -->|Mark Completed| Course
    Quiz -->|auto-advance, next item is a lesson| Lesson
    Quiz -->|auto-advance, next item is a quiz| Quiz
    Quiz -->|node finished / no next item| Course
    Dictionary --> TermDetail["Term detail"]
    Dictionary --> Bucket
    Dictionary -->|Take Quiz| DictModes["Quiz Mode Select\n/quiz/modes/dictionary/[miniAppId]"]
    DictModes --> Quiz
```

**Note on the "auto-advance, next item is a lesson" edge**: this is the code's actual current
behaviour, not a design endorsement — `QuizSessionScreen.tsx`'s post-quiz auto-advance still
`router.replace()`s to `.../course/[courseSlug]/lesson/[lessonId]`, a dedicated lesson-player
route the Course & Topic redesign Phase C removed in favour of `LessonModal`. That route no
longer exists, so this specific auto-advance path is dead code today (pre-existing, found while
tracing this diagram for the Quiz Modes work below — not touched here, since fixing it means
deciding what "auto-advance into a lesson" should even mean now that lessons open in a modal
over the Course screen rather than a route of their own).

The diagram above is the happy path. The literal file tree, annotated:

```
apps/mobile/app/
├── _layout.tsx                     Root: Redux Provider, GestureHandlerRootView,
│                                    auth-bootstrap effect, splash-hold, root <Stack>
├── index.tsx                       "/" — resolves via <ProtectedRoute>, then
│                                    redirects to /(app)/home once fully set up
├── select-profile.tsx              Netflix-style profile picker + PIN pad
├── profile-setup.tsx               One-time DOB + education-level form
│
├── (auth)/                         Route group — unauthenticated only
│   ├── _layout.tsx                 Self-redirects away if already logged in
│   ├── login.tsx
│   └── signup.tsx
│
├── (app)/                          Route group — guarded, ScreenBackground applied once
│   ├── _layout.tsx
│   ├── home.tsx                    Enrolled-subjects list
│   ├── subject/
│   │   └── [subjectSlug]/
│   │       ├── index.tsx           Courses grid + Subject-level Mini-Apps
│   │       └── course/
│   │           └── [courseSlug]/
│   │               ├── index.tsx   Progress header + RoadmapPath (opens
│   │               │                NodeLessonsPanel as a bottom sheet on tap —
│   │               │                see §5, "A note on Topic")
│   │               ├── lesson/
│   │               │   └── [lessonId].tsx    Lesson resource player
│   │               └── chat/                 Course Chat (Aug 2026) — ordinary
│   │                   ├── index.tsx          nested routes, not root-level
│   │                   │                      fullScreenModal like quiz/ below
│   │                   └── ai-helper.tsx      (see mobile-architecture.md's
│   │                                          "Course Chat" section for why)
│   └── miniapp/
│       └── [miniAppId]/
│           ├── index.tsx           Dictionary home: search/trending/A–Z/recent
│           ├── term/
│           │   └── [termId].tsx    Term + definitions detail
│           └── bucket.tsx          Saved-words list, filter + sort
│
└── quiz/                           Root-level — NOT nested in (app), see §1.6
    ├── [itemId].tsx                Quiz for a roadmap node's quiz item
    └── dictionary/
        └── [miniAppId].tsx         Dictionary's "Take Quiz" entry point
    (both render the shared <QuizSessionScreen>, fullScreenModal presentation)
```

Non-route source, for orientation (not URL-addressable, but load-bearing for everything above):

```
apps/mobile/src/
├── components/
│   ├── GlassCard.tsx, PrimaryButton.tsx, ScreenBackground.tsx, TextField.tsx   base UI
│   ├── ProtectedRoute.tsx                                                     the guard
│   ├── dictionary/   SearchInput, TrendingTerms, AlphabetPicker, RecentSearches,
│   │                 DictionaryBrowseList, DefinitionCard, BucketEntryCard
│   ├── lesson/       LessonVideo, SteppedNotesViewer, markdownStyles
│   ├── roadmap/      RoadmapPath, RoadmapNodeCircle (child), RoadmapNodeCard
│   │                 (adult/teen), NodeLessonsPanel (the "topic" bottom sheet)
│   └── quiz/
│       ├── QuizSessionScreen.tsx   shared session loop backing both quiz/ routes
│       ├── QuestionRenderer.tsx    dispatches to a pattern by question.type
│       ├── QuizProgress.tsx, AnswerFeedback.tsx, QuizResults.tsx, SpokenText.tsx
│       └── patterns/  McqPattern, TrueFalsePattern, TypedInputPattern,
│                      DndSinglePattern, DndBuildPattern, DndCountPattern, DndTile
├── features/          Redux slices: auth, content, vocab, roadmap, quiz
├── lib/                api.ts (axios + interceptors), audio.ts, assetUrl.ts, lang.ts,
│                       secureStore.ts, useSpeak.ts (live TTS)
└── store/store.ts
```

---

## 3. Screen-by-screen reference

### Launch & session bootstrap

**File:** `app/_layout.tsx` *(no route of its own — runs before any screen renders)*

The native splash image stays up (`SplashScreen.preventAutoHideAsync()`) while an effect dispatches `bootstrapAuth()`, which reads a refresh token out of `expo-secure-store` and exchanges it for a fresh access token if one exists — mobile's replacement for web's cookie-based `checkAuth`, since native has no persistent cookie jar. Once `isCheckingAuth` flips false, the splash hides and `index.tsx` takes over.

**File:** `app/index.tsx` — renders nothing itself, just `<Redirect href="/(app)/home"/>` wrapped in `<ProtectedRoute>`; the real destination is whatever the guard decides (§4.1).

### Authentication

**Route:** `/(auth)/login` · **File:** `(auth)/login.tsx`
Email + password over the wallpaper background. Handles one case beyond a wrong password specifically: logging in against an unverified email surfaces a distinct "check your inbox" message rather than a generic error.
**Data:** `auth` slice, `login` thunk. **Goes to:** success → `replace('/select-profile')`; Signup link → `/(auth)/signup`.

**Route:** `/(auth)/signup` · **File:** `(auth)/signup.tsx`
Name + email + password + confirm, with client-side length/match checks before the API call. On success the form is swapped in place for a "check your inbox" message (no separate route) with a link back to Login.
**Data:** `auth` slice, `register` thunk. **Worth knowing:** nothing currently handles what happens after the emailed verification link is tapped — see §6.1.

### Profile selection & setup

**Route:** `/select-profile` · **File:** `select-profile.tsx`
Tile grid, one per profile on the account (up to 6) — initials avatar, display name, colour-coded age-group badge. A profile with no PIN selects immediately; a PIN-protected one opens a 4-digit keypad modal that auto-submits on the fourth digit.
**Guard:** `<ProtectedRoute requireFullToken={false}>` — requires a `partialToken`, but redirects to Home if a full `accessToken` already exists (relevant for §6.4).
**Data:** `auth` slice — `selectProfile`, `fetchActiveProfile`, `logoutAsync`.
**Goes to:** profile chosen → `/(app)/home` or `/profile-setup` depending on `isSetupComplete`. **Comes from:** Login on success, or any guard finding a `partialToken` with no `accessToken`.

**Route:** `/profile-setup` · **File:** `profile-setup.tsx`
One-time form: date of birth (three horizontally-scrolling chip rows) and current education level (chip rows, School always shown, Tertiary/Other only for non-child profiles). Copy and emoji shift for `ageGroup === 'child'`.
**Data:** `auth` slice, `completeProfileSetup`. **Goes to:** submit or "Set up later" — both land on `/(app)/home` (the latter skips the API call entirely). **Comes from:** the guard, whenever a full token exists but `activeProfile.isSetupComplete` is false.

### Home

**Route:** `/(app)/home` · **File:** `(app)/home.tsx`
Flat list of enrolled subjects as glass cards; an empty state ("Your backpack is empty!") when there are none. "+ Add more subjects" opens an in-place modal (not a route) grouped by field, each with an Enrol button.
**Data:** `content` slice — `fetchEnrolledSubjects`, `fetchAvailableSubjects`, `enrollInSubject`. **Goes to:** a subject card → `/(app)/subject/[subjectSlug]`. **Comes from:** essentially everywhere — the universal post-auth landing point and the "return" target for most deeper flows.
**Worth knowing:** doesn't branch on `ageGroup` at all — a child and an adult see an identical list.

### Subject

**Route:** `/(app)/subject/[subjectSlug]` · **File:** `subject/[subjectSlug]/index.tsx`
Two stacked sections: **Courses** (primary — name, description, node count shown as "X topics") and **Mini-Apps** (secondary row, currently just Dictionary).
**Data:** `content` slice — `fetchCoursesBySubject`, `fetchSubjectMiniApps`. Resolves `fieldSlug`/`subjectName` by scanning the already-loaded `enrolledSubjects` list rather than fetching directly — this screen currently assumes it's only ever reached via Home.
**Goes to:** a course → `.../course/[courseSlug]`; a mini-app → `/(app)/miniapp/[miniAppId]`. **Comes from:** Home only, today.

### Course (the roadmap)

**Route:** `/(app)/subject/[subjectSlug]/course/[courseSlug]` · **File:** `course/[courseSlug]/index.tsx`
Progress header (X of Y items, percentage bar), a row of linked-mini-app quick-links if any, then the roadmap via `<RoadmapPath>`, which renders one of two ways by `ageGroup`:
- **child:** a winding SVG path, large circular node markers (`RoadmapNodeCircle`) alternating left/right down the screen.
- **adult / teen:** a plain vertical list of node cards (`RoadmapNodeCard`) with a status badge, star rating, and item-completion count.

Tapping any unlocked node, either mode, opens **`NodeLessonsPanel`** — a bottom-sheet modal listing that node's lessons and quiz items with per-item lock/progress state. **This panel is the current stand-in for what you're calling "the topic screen" — see §5.**
**Data:** `content` slice (`fetchCourseDetail`) + `roadmap` slice (`fetchRoadmapByCourse`).
**Goes to:** a lesson row → `.../lesson/[lessonId]`; a quiz row → `/quiz/[itemId]`; a linked mini-app chip → `/(app)/miniapp/[miniAppId]`. **Comes from:** Subject only.

A fourth FAB ("Chat") sits in `CoursePathActions`' bottom-right stack, directly above the
Mini-apps FAB — see the entry immediately below.

### Course Chat (August 2026)

**Route:** `.../course/[courseSlug]/chat` · **File:** `course/[courseSlug]/chat/index.tsx`
Hub with two tiles: **AI Helper** (enabled) and **Classmates & Teacher** (muted, non-interactive,
badged "🔜 Coming soon" — no teacher accounts or class/cohort model exist yet, see
[docs/product/course-chat-vision.md](../product/course-chat-vision.md)). `courseId`/`courseName`
arrive as router params from the Course screen's button rather than being re-derived from Redux.
**Goes to:** AI Helper tile → `.../chat/ai-helper`. **Comes from:** Course screen only.

**Route:** `.../course/[courseSlug]/chat/ai-helper` · **File:** `course/[courseSlug]/chat/ai-helper.tsx`
1:1 chat with a course-scoped AI tutor — message history + text input, optimistic send (the
learner's bubble renders from local state immediately, replaced by the confirmed pair from Redux
once the server responds). History persists indefinitely per profile+course.
**Data:** `aiChat` slice — `fetchChatHistory`, `sendChatMessage`.
**Goes to:** back → Course Chat hub. **Comes from:** Course Chat hub only.
**Worth knowing:** unlike `/quiz/[itemId]`, this is an ordinary nested route inside `(app)`, not
a root-level `fullScreenModal` — see mobile-architecture.md's "Course Chat" section for why.

### Lesson player

**Route:** `.../course/[courseSlug]/lesson/[lessonId]`
Renders `ILesson.resources[]` sorted by position, one block per type — video (`expo-video`), image, audio (tap-to-play), markdown notes, stepped notes, or a PDF link (opens via `Linking.openURL`). One "Mark as complete" button posts completion, then auto-advances after 1.5s.
**Data:** `roadmap` slice — `fetchLesson`, `clearLesson` on unmount.
**Goes to (via `replace`, never `push`):** the next lesson, or `/quiz/[itemId]` if the next item is a quiz, or back to the Course screen if the node is finished. Manual back → `back()` (always lands on Course, however many auto-advances happened since, because `replace` never touches history entries below the current one).

### Quiz-taking (one screen, two entry points)

**Routes:** `/quiz/[itemId]` (roadmap node) and `/quiz/dictionary/[miniAppId]` (Dictionary's "Take Quiz") — both thin wrappers rendering the shared `<QuizSessionScreen>`, root-level, `fullScreenModal`.
Full question loop: progress bar, one question via `<QuestionRenderer>` (dispatches by `question.type` to MCQ / True-False / Typed Input / one of three drag-and-drop patterns), immediate or end-of-quiz feedback via `<AnswerFeedback>`, then `<QuizResults>`.
**Two flavours, one component:** a roadmap quiz item drives the same auto-advance-to-next-item flow as the Lesson player and posts node/item completion (an XP + peanuts banner shows on node completion); a mini-app quiz just shows results with no roadmap side effects, and pre-checks the learner actually has bucketed words before starting rather than allowing an empty session.
**Data:** `quiz` slice — `startQuizItemSession` / `startMiniAppQuizSession`, `submitAnswer`, `advanceQuestion`, `completeSession`, `abandonSession`. Session cleanup fires from an unmount-only effect, which covers hardware-back and swipe-back automatically.
**Goes to:** close (✕, top-right) → `back()` always. Roadmap flavour on completion → auto-`replace` to the next lesson/quiz/Course, same pattern as the Lesson player. Mini-app flavour's "Back to Dictionary" → `back()`.
**Worth knowing:** live text-to-speech (explanation + feedback text) plays through `<SpokenText>` — tap-to-read only, never autoplay, no word-by-word highlighting (an `expo-speech` API limitation, not a design choice). Docs elsewhere in this repo still describe TTS as not-yet-built; that's stale — see the note in §7.

### Dictionary mini-app

**Route:** `/(app)/miniapp/[miniAppId]` · **File:** `miniapp/[miniAppId]/index.tsx`
One `FlatList` (not stacked scroll views, so pagination has a real scroll container to fire against), header holding search + trending + an A–Z letter picker, body the paginated browse grid. `type` is passed as a param specifically so this route can show a "Coming soon" placeholder for any mini-app type other than `dictionary` — built to eventually host more types, not just this one.
**Data:** `vocab` slice, via the `useDictionaryBrowse` hook.
**Goes to:** any term → `.../term/[termId]`. "Take Quiz" → `/quiz/dictionary/[miniAppId]`. "My Bucket" → `.../bucket`. "Home" → `replace('/(app)/home')` — **note this is `replace`, not `back`**, unlike most other back buttons in the app.

**Route:** `.../miniapp/[miniAppId]/term/[termId]`
Word, phonetic spelling, pronunciation audio, and every definition (via `DefinitionCard`, which also handles add/remove-from-bucket). Its own route — rather than inline modal state — specifically so it's linkable and supports normal back navigation.
**Data:** `vocab` slice — `fetchTermDetail`, `clearActiveTerm`. **Goes to/from:** reached wherever a term is tappable; "Back to search" → `back()`.

**Route:** `.../miniapp/[miniAppId]/bucket`
Saved words — status tabs (All/Learning/Mastered/Paused) and six sort options (recent, A–Z, confidence, accuracy, last practised, due for review), each entry showing its learning-record stats.
**Data:** `vocab` slice — `fetchBucket`, `removeBucketEntry`, `setBucketStatusFilter`. **Goes to:** a term → `.../term/[termId]`. "Back to {name}" and the empty-state CTA both → `replace()` to Dictionary home (again `replace`, not `back`).

---

## 4. Cross-cutting architecture

### 4.1 The guard model — `<ProtectedRoute>`

| Situation | `requireFullToken=true` (default — `(app)`, Profile Setup) | `requireFullToken=false` (Select Profile only) |
|---|---|---|
| Still checking auth on cold start | render nothing | render nothing |
| No token at all | → Login | → Login |
| Only a `partialToken` | → Select Profile | render the screen |
| Full `accessToken`, profile incomplete | → Profile Setup (unless `allowIncompleteProfile`) | → Home |
| Full `accessToken`, profile complete | render the screen | → Home |

The bottom-right cell — a full token always bounces away from Select Profile — is the one to know about before designing a profile-switcher; see §6.4.

### 4.2 Redux — five slices, mapped to what reads them

| Slice | Screens |
|---|---|
| `auth` | Login, Signup, Select Profile, Profile Setup, and every guard check |
| `content` | Home, Subject, Course (course/mini-app metadata — not the roadmap itself) |
| `roadmap` | Course (the roadmap + progress), Lesson player |
| `quiz` | Both quiz routes, via `QuizSessionScreen` |
| `vocab` | All three Dictionary screens |

### 4.3 Base UI building blocks

- **`ScreenBackground`** — the wallpaper image + background colour. Applied once, centrally, by `(app)/_layout.tsx` for every screen in that group; the four screens outside it (Login, Signup, Select Profile, Profile Setup) each wrap themselves individually.
- **`GlassCard`** — the frosted-glass surface (`expo-blur` + semi-transparent fill), three intensities (soft/default/strong).
- **`PrimaryButton`** — filled violet button, loading/disabled/success states.
- **`TextField`** — labelled input with an error slot.

All four pull colours/radii/spacing/type sizes from `packages/shared/constants/theme.ts` (mirrored in `docs/design/brand-guide.md`) — a palette or radius-scale change belongs there once, not per component.

### 4.4 Where `ageGroup` actually changes anything

Only these branch on the active profile's `ageGroup` today: the Course screen / `RoadmapPath` (winding path vs card list), the three drag-and-drop patterns, `AnswerFeedback` (copy + sizing), `QuizProgress` (bar height + label size), and Profile Setup (copy + which education levels show). **Home, Subject, the Lesson player, and all three Dictionary screens render identically for a 6-year-old and a 30-year-old today.** Also: `theme.ts` defines `typography.bodyChild` (18px, matching the brand guide's stated minimum for children's body text), but nothing in the mobile app references it yet.

### 4.5 API client

One axios instance (`lib/api.ts`): `X-Client-Type: mobile` header on every request, 30s timeout (Render's free-tier cold starts run close to that), bearer token attached from Redux state via a request interceptor, and a response interceptor that transparently refreshes on a 401 using the refresh token from `expo-secure-store`, retrying the original request once before falling back to a full logout.

---

## 5. A note on "Topic"

Worth being precise here, because the terminology shifted recently: **the `Topic` model was removed from the schema in July 2026.** The hierarchy today is `Field → Subject → Course (wraps a Roadmap) → RoadmapNode → (Lesson | Quiz item)`, with Mini-Apps (Dictionary) attached directly to a Subject rather than routed through anything Topic-shaped.

The word survives in one place: the Subject screen's course cards say "X topics," and that number is `course.roadmap.nodeCount` — a count of `RoadmapNode`s. So **"RoadmapNode" is almost certainly what "topic" means in your Figma plans.** A RoadmapNode has no screen of its own today.

**Updated (Course & Topic redesign, Phase C, August 2026):** `NodeLessonsPanel` — the node-tap bottom sheet this section originally described — no longer exists. `RoadmapPath` now renders one button per *item* (not per node) directly on the Course screen, with each node's title as a non-tappable banner rather than a separate tap target. Tapping a lesson item opens `LessonModal` (still a bottom-sheet `Modal`, same interaction shape `NodeLessonsPanel` used, just scoped to one lesson instead of a whole node); tapping a quiz item now opens the Quiz Mode Select screen (a real route, `/quiz/modes/[itemId]`) ahead of the quiz session — see §8 and `mobile-architecture.md`'s "Quiz Modes" section. "Moving the topic to a separate screen" is therefore no longer a single clean lift from one panel — lesson and quiz items now have two different presentations (modal vs. route).

If you meant something else by "topic," flag it — otherwise I'd plan around RoadmapNode.

---

## 6. Suggested / missing screens

### 6.1 Forgot password / Reset password / Verify email

None of these exist on mobile — not just the UI; `authSlice.ts` doesn't port the four thunks web already has and uses (`forgotPassword`/`resetPassword`/`verifyEmail`/`resendVerification`, backing `ForgotPasswordPage.tsx`/`ResetPasswordPage.tsx`/`VerifyEmailPage.tsx`). Right now Login's answer to "I forgot my password" is nothing — no link, no flow.

The screens themselves are a straightforward port (web already has the UI/validation to mirror, same as every other auth screen here). The part needing a decision before implementation: password-reset and verification emails currently link to the web app (`CLIENT_URL` is web-only, by design, for CORS/OAuth). A mobile user tapping that link opens a browser, not the app — fine as a stopgap, but worth a deliberate call (mobile-aware email templates, or a universal-link handoff) rather than discovering it once someone complains.

Rough placement: `(auth)/forgot-password.tsx`, `(auth)/reset-password/[token].tsx` (mirrors web's `/reset-password/:token`), and a root-level `verify-email.tsx` (reachable with no token at all — a not-yet-logged-in user is exactly who taps this link).

### 6.2 A proper launch screen

"Launch" today is just `expo-splash-screen`'s default behaviour — the plugin is listed in `app.json` with no image/background/resize configuration, so nothing designed actually happens while `bootstrapAuth()` resolves. Given the brand has a defined visual identity (and `docs/design/asset-locations.md` already reserves — but hasn't populated — a GCS folder for onboarding illustrations), this is a natural first-impression moment to design deliberately rather than leave at the platform default.

### 6.3 A 404 / not-found route

Expo Router has a standard convention for this — a `+not-found.tsx` at the app root — and this project doesn't have one. Low effort, easy to fold into this pass.

### 6.4 Settings / Account — and the profile-switch gap it needs to solve

The biggest structural gap found: **there is currently no way to sign out, or switch to a different profile, from anywhere inside `(app)`.** The only "Sign out" button in the app lives on the Select Profile screen, reachable today only via a fresh login or a guard redirect. Once a profile is active, the learner is in `(app)` with no account-level screen at all — matches CLAUDE.md's own checklist, which still has "Profile management screens" unticked.

This isn't just "add a Settings screen with a Sign-out row," though. `ProtectedRoute`'s Select-Profile branch actively redirects to Home whenever a full `accessToken` exists (§4.1), so a naive "Switch profile" link would just bounce back to Home. And unlike the moment right after login, the `partialToken` Select Profile normally depends on is cleared the instant a profile is first chosen (`selectProfile.fulfilled` nulls it out) — so there's no fallback token to lean on either. A real profile-switcher needs a distinct path: either the account stays authenticated while only the active-profile selection resets (a new "switch profile" action, plus a guard branch that allows Select Profile with a full token when reached deliberately), or a dedicated re-list-profiles call that doesn't require re-deriving anything from a login step. Worth designing this explicitly rather than hitting the guard conflict mid-implementation.

Rough placement: `(app)/settings/index.tsx`, reachable from Home — and the natural eventual home for profile-management screens (edit profile, change PIN, avatar).

### 6.5 OAuth on native

Google/Facebook sign-in exists on web, not mobile (email/password only). Already on your own roadmap (Prompt 4 in `mobile-architecture.md`); flagging because it touches the Login/Signup screens you're about to restyle — worth deciding now whether to reserve visual space for the buttons even if the `AuthSession`/deep-link wiring lands later.

### 6.6 Peanuts / rewards (placeholder, not urgent)

Not buildable yet — the reward *service layer* doesn't exist server-side, schema-only per CLAUDE.md — but the brand guide already names a peanuts "wallet" as a real destination ("in the learner's wallet, in question feedback, in the parent dashboard"). Nothing to design in detail yet, but worth reserving a slot in any new navigation structure so it isn't a bolt-on later.

### 6.7 Consider: a bottom tab bar

Not a missing screen so much as missing navigation structure — `mobile-architecture.md` notes outright that "there is no tab bar in this app yet." Once Settings exists (§6.4) and Peanuts eventually needs a home (§6.6), a bottom tab bar (Home / Peanuts-later / Settings) is the natural place for persistent access to both — and would also resolve §6.4's reachability problem by giving profile-switching a permanent, visible entry point instead of a buried menu item. Worth deciding during the Figma pass, since it changes where `(app)/_layout.tsx` sits in the tree.

---

## 7. Observations for the restyle (facts, not a plan)

- `ScreenBackground` is applied once for all of `(app)` but individually on the four auth-adjacent screens outside it — a background change touches one file for most of the app, four files for the rest.
- `typography.bodyChild` (18px, the brand guide's stated child minimum) is defined but unreferenced anywhere in mobile — every screen currently uses the same body size regardless of `ageGroup`.
- Only a handful of screens/components branch on `ageGroup` at all (§4.4) — Home, Subject, the Lesson player, and all three Dictionary screens are age-agnostic today.
- Updated: `NodeLessonsPanel` ("the topic," §5) is gone as of Phase C. Its modal-not-route pattern lives on in `LessonModal`/`ResourcesModal`/`QuizPickerModal` (`src/components/course/`) — lessons stay a `Modal`, but a quiz item now opens a real route (`/quiz/modes/[itemId]`) instead of the old bottom sheet.
- Two screens use `replace()` for what reads as an ordinary back action (Dictionary home's "Home" button, Bucket's "Back to Dictionary") where every other back button in the app uses `back()` (§1.5).
- No `(app)` screen has header/back-chrome supplied by a shared layout — each screen builds its own back button inline, so a consistent header treatment touches every screen file individually, not one layout.
- Live TTS (`expo-speech`, tap-to-read, no word highlighting) is already shipped and wired into `AnswerFeedback` — some docs elsewhere in this repo (including the mobile CLAUDE.md checklist copy) still list it as "not yet built." Worth a docs pass alongside whatever Claude Code prompt eventually implements the restyle.

*Cross-reference: worth linking this doc from CLAUDE.md's structure notes and from `mobile-architecture.md`'s routing section next time either gets touched.*

---

## 8. Quick-reference table

| Screen | Route | File |
|---|---|---|
| Bootstrap redirect | `/` | `app/index.tsx` |
| Login | `/(auth)/login` | `app/(auth)/login.tsx` |
| Signup | `/(auth)/signup` | `app/(auth)/signup.tsx` |
| Select Profile | `/select-profile` | `app/select-profile.tsx` |
| Profile Setup | `/profile-setup` | `app/profile-setup.tsx` |
| Home | `/(app)/home` | `app/(app)/home.tsx` |
| Subject | `/(app)/subject/[subjectSlug]` | `.../subject/[subjectSlug]/index.tsx` |
| Course | `/(app)/subject/[subjectSlug]/course/[courseSlug]` | `.../course/[courseSlug]/index.tsx` |
| Lesson player | *(removed, Phase C — see §5)* | now `LessonModal`, not a route |
| Quiz Mode Select (roadmap) | `/quiz/modes/[itemId]` | `app/quiz/modes/[itemId].tsx` |
| Quiz Mode Select (Dictionary) | `/quiz/modes/dictionary/[miniAppId]` | `app/quiz/modes/dictionary/[miniAppId].tsx` |
| Quiz (roadmap) | `/quiz/[itemId]` | `app/quiz/[itemId].tsx` |
| Quiz (Dictionary) | `/quiz/dictionary/[miniAppId]` | `app/quiz/dictionary/[miniAppId].tsx` |
| Dictionary home | `/(app)/miniapp/[miniAppId]` | `.../miniapp/[miniAppId]/index.tsx` |
| Term detail | `.../miniapp/[miniAppId]/term/[termId]` | `.../term/[termId].tsx` |
| Bucket | `.../miniapp/[miniAppId]/bucket` | `.../bucket.tsx` |

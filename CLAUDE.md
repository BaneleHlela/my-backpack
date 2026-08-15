# My Backpack

A digital backpack — a comprehensive education platform with multiple mini-apps 
(vocab, math, engineering subjects, etc.). Designed for multiple age groups from 
a single codebase, serving age-appropriate content to adult users and younger 
profiles. The platform's core goal is personalised learning pace — users learn 
at their own speed and are alerted when they are test-ready.

---

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Backend**: Node.js + Express + TypeScript (`apps/api`)
- **Web**: React + Vite + TypeScript + Redux Toolkit (`apps/web`)
- **Mobile**: React Native + Expo + TypeScript + Redux Toolkit (`apps/mobile`) —
  Expo Router (file-based routing), `expo-secure-store` (refresh token
  persistence), `expo-audio` (pronunciation playback — not `expo-av`,
  deprecated), `expo-blur` (glassmorphism cards), `expo-video` (Lesson video
  resources), `react-native-gesture-handler` + Reanimated (hand-rolled
  `dnd_single` drag-and-drop — see docs/technical/mobile-architecture.md)
- **Shared types**: `packages/shared`
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Cache**: Redis via Upstash
- **Auth**: JWT — two-step flow (partial token post-login + full token 
  post-profile-select + refresh token in HTTP-only cookie)
- **OAuth2**: Google and Facebook strategies via Passport.js
- **Asset storage**: Google Cloud Storage (bucket: my-backpack-assets, 
  region: africa-south1)
- **AI**: Anthropic Claude Haiku (claude-haiku-4-5-20251001) for question 
  generation and content processing
- **Monorepo tooling**: pnpm workspaces, TypeScript strict mode throughout

---

## Running the Project

```bash
# From root — start API
pnpm --filter api dev

# From root — start web
pnpm --filter web dev

# From root — start mobile
pnpm --filter mobile dev

# Seed the database
pnpm --filter api seed

# Generate questions for a term
pnpm --filter api generate-questions -- --termId=xxx --definitionId=xxx

# Cleanup generated questions (reset)
pnpm --filter api cleanup-questions
```

---

## Git Strategy

```
main        ← production (auto-deploys)
develop     ← working branch
feature/xxx ← feature branches off develop
```

Never push directly to main. Always merge develop → main via PR.

---

## Hosting (Free Tier)

| Service | Purpose |
|---|---|
| Vercel | React web app |
| Render | Express API (sleeps after 15min inactivity on free tier) |
| MongoDB Atlas | Database (512MB free) |
| Upstash | Redis cache (10,000 commands/day free) |
| Google Cloud Storage | Asset storage (5GB free) |
| Expo Go | Mobile dev testing (scan QR, no build needed) |
| EAS Build | Installable Android/iOS builds (free tier: 15 Android + 15 iOS builds/month) |

---

## Core Concept: Account → Profiles

One **Account** handles authentication (email, password, OAuth, or guest — see below).
An Account can have up to **6 Profiles**. Each Profile is what actually 
uses the app — has its own progress, settings, age-appropriate content, 
and learning data. Think Netflix-style profile switching.

- Account owner logs in → sees profile selector → selects profile → 
  gets full access token
- Child profiles can be PIN-protected
- Only the owner profile can create, edit, or delete other profiles
- Maximum 6 profiles per account — enforced at service level (guest accounts are not capped
  below this — `POST /api/profiles` doesn't care whether the account has credentials)

### Guest mode (mobile only — see [docs/technical/guest-mode.md](docs/technical/guest-mode.md))
A guest is a real Account + Profile with no email/password (`Account.isGuest: true`) — not a
parallel local-only system. `POST /api/auth/guest` creates one and returns a full access token
directly, skipping the partial-token/select-profile round trip entirely (there's exactly one
profile, nothing to verify). Every existing `requireProfile`-gated route already works for it
unchanged. `POST /api/auth/claim` later adds email/password credentials to that same account
(same profiles, same progress, no logout) — mobile surfaces this as "Save your progress" in
`ProfileSwitcherModal` plus a one-time nudge after a guest's first completed quiz. Web has no
guest entry point yet — a deliberately separate, later pass.

### Auth Flow
1. Register/Login → partial JWT (accountId only) + refresh token in 
   HTTP-only cookie
2. Select profile → full JWT (accountId + profileId + ageGroup)
3. All protected routes require full JWT
4. Access token: 15 minutes | Refresh token: 7 days
5. Guest (mobile only): `POST /api/auth/guest` → full JWT directly, no partial-token step

### Middleware
- `requireAccount` — verifies JWT, works with partial token
- `requireProfile` — requires full token with profileId
- `requireOwner` — checks profile.isOwner === true
- `requirePlatformAdmin` — checks profile.isPlatformAdmin === true; mirrors `requireOwner`. Gates
  every `/api/dashboard/*` route (mounted alongside `requireProfile`, since it reads `req.profile`)
- `ageGroupFilter` — reads ageGroup from JWT, attaches contentPrefs to req

### Content preferences by ageGroup
```
child:
  maxDefinitions: 1
  simplifiedLanguage: true
  allowedQuestionTypes: ['mcq_term_to_def', 'mcq_def_to_term', 
                          'true_false_term_def', 'mcq_audio']

teen:
  maxDefinitions: 2
  simplifiedLanguage: false
  allowedQuestionTypes: [all except voice]

adult:
  maxDefinitions: 10
  simplifiedLanguage: false
  allowedQuestionTypes: [all]
```

---

## Content Hierarchy

```
Field           (e.g. Language, Mathematics, Engineering)
  Subject       (e.g. English, IsiZulu Home Language, Calculus)
    Course[]    (e.g. Phonics, Sounds, Number Sense) — wraps exactly one Roadmap
      Roadmap → nodes[] → RoadmapNode ("Topic" in the UI/dashboard vocabulary)
                             → items[] (Lesson | Quiz)
    MiniApp[]   (e.g. Dictionary, Flashcards) — reparented directly under Subject
```

`Topic` was removed entirely (superseded July 2026 — see
[docs/content/course-roadmap-restructure-design.md](docs/content/course-roadmap-restructure-design.md)).
Its two jobs split cleanly: grouping MiniApps under a Subject is now just
`MiniApp.subjectId`, and the "individual step" meaning kept the name, applied to what was
already `RoadmapNode` (now with its own `slug`). A Subject can have multiple Courses — each
wraps one Roadmap and can optionally surface existing MiniApps (e.g. Dictionary) as
convenience links via `Course.miniAppIds`. `Course.team` and `RoadmapNode.linkedCourseIds`
are reserved fields for a deferred multi-provider-course/marketplace feature — see
[docs/product/course-marketplace-vision.md](docs/product/course-marketplace-vision.md); both
are unused (always empty) today.

### Rule of thumb for placing models
- Exists before any learning starts → `models/core/`
- Tracks learning but subject-agnostic → `models/learning/`
- Specific to one mini-app's content → `models/apps/field/subject/topic/` (directory naming
  only — `Topic` is not a model)

### MiniApp types
`'quiz' | 'dictionary' | 'flashcards' | 'practice'`
Used by frontend to know which UI to render. (`'roadmap'` was removed — Course now owns that job.)

### Seeded hierarchy
```
Language (field)
  ├── English (subject)
  │     ├── Dictionary (miniApp, type: dictionary)
  │     └── Phonics (course, slug: phonics)
  │           └── Roadmap: "English Phonics"
  │                 ├── Node 1: Vowel Sounds — 7 items: 1 lesson (video intro) + 6 quiz
  │                 │     items escalating distractor count (1→2→5) and audio-on-tap
  │                 │     (60 dnd_single questions + 5 mcq_audio kept for reuse)
  │                 └── Node 2: Three-Letter Words — 3 items: 1 lesson + 2 quiz items (22 questions: mcq_audio + dnd_build × 11 CVC words)
  └── IsiZulu Home Language (subject)
        └── Sounds (course, slug: sounds)
              └── Roadmap: "IsiZulu Sounds"
                    ├── Node 1: Izinhlamvu Zokuvuma — Vowels — 7 items: 1 lesson (video
                    │     intro) + 6 quiz items escalating distractor count (1→2→5) and
                    │     audio-on-tap (60 dnd_single questions + 5 mcq_audio kept for reuse)
                    └── Node 2: Izinhlamvu Zongwaqa — Consonants — 3 items: 1 lesson + 2 quiz items (20 questions: mcq_audio + dnd_build × 10 syllables)

Foundation Phase Mathematics (field)  [note: actual field slug — verify via DB if querying]
  └── Foundation Phase Mathematics (subject)
        └── Number Sense (course, slug: number-sense)
              └── Roadmap: "Number Sense Roadmap"
                    ├── Node 1: Let's Learn to Drag! — 3 items: 1 lesson + 2 quiz items (8 practice + 5 assessment dnd_single questions)
                    └── Node 2: Counting 1 to 10 — 3 items: 1 lesson + 2 quiz items (10 dnd_count questions)
```

**Note on `miniAppId` for roadmap-linked content:** `Term`/`Question`/`Quiz.miniAppId` for the
vowels/consonants/CVC/counting/drag-intro content above is scoped to the owning **Course's
`_id`**, not a MiniApp document — there's no MiniApp for roadmap content anymore. The one-time
migration reused each legacy roadmap-type MiniApp's `_id` as the new Course's `_id` so existing
Term/Question/Quiz/QuizSession documents keep resolving without a mass data migration.

---

## Model Structure

```
apps/api/src/models/
├── core/
│   ├── account.model.ts
│   ├── profile.model.ts
│   ├── field.model.ts
│   ├── subject.model.ts
│   ├── course.model.ts
│   └── miniApp.model.ts
├── learning/
│   ├── learningRecord.model.ts
│   ├── adaptiveProfile.model.ts
│   ├── quizSession.model.ts
│   ├── answerRecord.model.ts
│   ├── roadmap.model.ts
│   ├── roadmapNode.model.ts
│   ├── lesson.model.ts
│   ├── profileRoadmapProgress.model.ts
│   ├── profileSubjectEnrollment.model.ts
│   └── aiChatMessage.model.ts
└── apps/
    └── language/
        └── vocabulary/
            ├── term.model.ts
            ├── definition.model.ts
            ├── question.model.ts
            ├── termBucket.model.ts
            └── bucketEntry.model.ts
```

---

## Key Models — Field Definitions

### Account
Authentication only. Fields: email, password (bcrypt, cost 12), 
authProviders[] (provider: 'local' | 'google' | 'facebook' | 'guest'), profiles[],
activeProfile, isEmailVerified, isGuest.

`isGuest` (default `false`) marks a credential-less account created via `POST /api/auth/guest`
(mobile only — see [docs/technical/guest-mode.md](docs/technical/guest-mode.md)). `POST
/api/auth/claim` later sets `email`/`password` and flips it back to `false` without touching
`profiles`/`activeProfile`.

### Profile
App usage entity. Fields: accountId, displayName, avatarUrl, ageGroup, 
dateOfBirth, isOwner, isPlatformAdmin, pin (bcrypt, cost 10), education, preferences, 
progress, isSetupComplete.

`isPlatformAdmin` gates the Content Studio dashboard (`requirePlatformAdmin` middleware, checked
alongside `requireOwner` above). Defaults to `false` — no UI grants it yet; set it directly in
MongoDB (`db.profiles.updateOne({_id: <profileId>}, {$set: {isPlatformAdmin: true}})`) for
whichever profile should have dashboard access.

Education levels (SA system):
`grade-r | grade-1 ... grade-12 | certificate | diploma | bachelors | 
honours | masters | phd | professional | other`

### Course
A course within a Subject — the umbrella for a roadmap-based learning path (e.g. "Phonics",
"Sounds", "Number Sense"). Wraps exactly one Roadmap. Fields: subjectId, name, slug
(unique per subjectId), description, iconUrl, roadmapId, miniAppIds[] (optional convenience
links, e.g. Dictionary), curriculumTags[], team (reserved, no shape yet — see
[docs/product/course-marketplace-vision.md](docs/product/course-marketplace-vision.md)),
isActive.

A Subject can have multiple Courses — replaces the old `Roadmap.findOne({ subjectId })`
"one roadmap per subject" assumption; fetching a subject's courses is `Course.find({ subjectId })`.

### Term
Shared across all users. Fields: word, miniAppId, phonetic, origin, 
audioUrl, source ('dictionary_api' | 'manual'), aiGenerationStatus 
('pending' | 'complete' | 'failed' | 'not_needed'), aiGenerationAttempts, 
aiGenerationError, aiGeneratedAt.

Note: Sound/phonics "terms" (vowels, consonant syllables, CVC words) are 
Term documents within their respective MiniApps — they plug into the 
existing adaptive learning system. Term.word is unique **per miniAppId** 
(compound index), not globally — the same letter 'a' can exist as a Term 
for isiZulu Sounds and for English Phonics independently. For this
roadmap-linked content, `miniAppId` holds the owning **Course's `_id`**, not a MiniApp
document's — see Course above.

### Definition
One term can have multiple definitions. Fields: termId, partOfSpeech, 
definition, examples[], synonyms[], antonyms[], order.

### Question
Shared across users. Fields: termId (optional), definitionId (optional), 
miniAppId, nodeId (optional — links to RoadmapNode), type, **content** 
(unified Mixed field — see IQuestionContent), maxPoints, pointsCanBePartial, 
source ('auto' | 'ai' | 'manual'), isGeneric, profileId (null for generic),
isActive.

All question data (prompt, options, correctAnswer, explanation, draggables, 
dropZones, feedback, avatar, defaultHelpers) lives inside `content`.
Cast `question.content as IQuestionContent` immediately after retrieval.
Types defined in `apps/api/src/modules/question/question.types.ts`.

**Question types and default maxPoints:**
```
mcq_term_to_def:     4   — show term, select correct definition
mcq_def_to_term:     4   — show definition, select correct term
mcq_correct_usage:   5   — select sentence using word correctly
mcq_incorrect_usage: 7   — select sentence using word incorrectly
mcq_fill_blank:      4   — sentence with blank, select correct word
mcq_audio:           4   — audio prompt, select correct answer
fill_blank_typed:    6   — sentence with blank, type exact word
true_false_term_def: 2   — is this definition correct for this term?
true_false_def_term: 2   — is this term correct for this definition?
true_false_usage:    3   — is the word used correctly in this sentence?
text_input_def:      5   — shown definition, type the term
text_input_audio:    5   — hear audio, type the term
text_input_example:  5   — example sentence with word removed, type term
dnd_single:          4   — drag one item to one zone
dnd_select:          4   — drag correct item from multiple options to one zone
dnd_count:           4   — drag a specific quantity of items to a zone
dnd_sort:            5   — sort items into multiple category zones
dnd_sequence:        5   — arrange items in correct order
dnd_match:           5   — match pairs across two columns
dnd_fill:            5   — drag words into sentence blanks
dnd_build:           5   — drag letters or syllables to build a word
```

**audio: prefix convention:**
When `content.prompt` starts with `"audio:"`, the frontend plays the 
remainder as a GCS path rather than displaying text.
Example: `"audio:sounds/isizulu/questions/khetha-umsindo-a.mp3"`

**Live TTS with word highlighting (interim):**
`apps/web/src/components/quiz/SpokenText.tsx` reads question prompts, avatar
dialogue, and answer feedback aloud with live word highlighting, using the
browser's Web Speech API via the `react-text-to-speech` npm package
(manual playback via a speaker-icon button — never autoplay). Language is
derived per-page from `subjectSlug` via `subjectSlugToLangCode()`
(`apps/web/src/lib/lang.ts`): `'isizulu-hl'` → `zu-ZA`, else `'en-US'`.
Prerecorded audio always wins — `SpokenText` is never rendered where an
`audioUrl` already exists (`content.prompt`'s `audio:` prefix,
`text_input_audio`'s fetched term audio, `feedback.audioUrl`) — **except**
`DndSinglePattern`'s avatar dialogue Replay control, which always speaks
`content.avatar.dialogue` live via TTS regardless of `avatar.dialogueAudioUrl`
(explicit product decision for that one control; `DndSinglePattern` calls
`useSpeech` directly rather than using `SpokenText`, since the existing Replay
button triggers `start()`/`stop()` itself). `DndSinglePattern` also speaks a
draggable item's `label` (via `useSpeak`'s imperative `speak()`) on tap/drag-start
when that item has no `audioUrl` — ordinary fallback rule here, not the dialogue's
override, since draggable audio is often phonetically load-bearing (isiZulu
vowel/consonant recordings). `IFeedback.text` (success/tryAgain) is now rendered
as visible text for the first time (previously schema-only, never displayed).
All live TTS requests `voiceURI: 'Google US English'` (`DEFAULT_TTS_VOICE` in
`apps/web/src/lib/lang.ts`) — silently falls back to the browser default voice
where that voice isn't installed (non-Chrome browsers).
This whole layer is explicitly interim, pending a future pre-generated
cloud-TTS pipeline (Azure AI Speech, authored via the teacher dashboard) —
see [docs/content/live-tts-word-highlighting.md](docs/content/live-tts-word-highlighting.md).

**isGeneric flag:**
- `true` — reusable across all users (generated from term+definition alone)
- `false` — user-specific (uses bucket context, future feature)

**IQuestionHelpers system:**
Each question has `content.defaultHelpers: Partial<IQuestionHelpers>`.
Frontend calls `resolveHelpers(content.defaultHelpers, nodeOverrides)` 
from `packages/shared/utils/resolveHelpers.ts` to get the final config — `nodeOverrides` is
currently always `undefined` at every call site (no per-node override mechanism is wired up
yet; the second param exists for future use).
`retryUntilCorrect` — DnD only: a wrong drop is rejected client-side (checked against
`content.dropZones[].requiredDraggableIds`) and never submitted to the server; the learner
must get the current question right before advancing, and the host quiz page hides its Skip
button. All 6 vowels dnd_single quiz variants (isiZulu + English) set this to `true`.
`shuffleDraggables` — DnD only: randomizes `content.draggables`' pool display order once per
question load (`DndSinglePattern` shuffles client-side via `useState` initializer, reshuffled
in the same effect that resets other per-question state — not re-shuffled on every re-render).
Defaults to `false` (authored order). Set per-question via `content.defaultHelpers` — editable
from Content Studio's `QuestionEditorPage.tsx` (a checkbox in the DnD fields section; the page
round-trips the question's full `defaultHelpers` object, not just this one field, so saving
never silently drops other helper overrides a seed script may have set, e.g.
`retryUntilCorrect`).

**DnD answer capture:**
`rawResponse = JSON.stringify({ placements: [{ draggableId, dropZoneId }] })`
Evaluated by `evaluateDnDAnswer()` in quizSession.service.ts.

**Illustration fields:**
`IQuestionContent.dragAreaImageUrl` — background image for the entire DnD widget
(draggable tray + drop zone), distinct from `IDropZone.imageUrl` (single-zone
background only). `DndSinglePattern` (frontend) applies
`ASSETS.DROP_ZONES.CLASSROOM_BOARD` as the drop zone's background by default on
every `dnd_single` question — `dropZone.imageUrl` overrides it per-question if set,
but no seed data sets it today, so all `dnd_single` drop zones currently show the
same classroom-board image regardless of subject. `IFeedback.avatarEmotion` — which
emotion `content.avatar`'s character shows when `successFeedback`/`tryAgainFeedback`
fires (same `avatarId`, different expression). `IAvatarConfig.emotion` is `'happy' |
'thinking' | 'excited' | 'encouraging' | 'sad' | 'serious' | 'smiling'` — not every
avatar has the full set (e.g. `miss-tutor` has no `'excited'` asset; check
`illustrations/avatars/{avatarId}/` in GCS before assigning a new emotion).

### BucketEntry
Per-definition adding — one entry per term+definition combination.
Fields: bucketId, termId, definitionId, profileId, partOfSpeech 
(denormalized), status ('learning' | 'mastered' | 'paused'), addedAt.
Unique index: bucketId + termId + definitionId.

### LearningRecord
Per profile per term per definition. Fields: profileId, termId, 
definitionId (optional), miniAppId, confidenceScore (0.0–1.0), 
status ('unseen' | 'learning' | 'mastered' | 'reviewing'), 
totalAnswers, correctAnswers, lastAnsweredAt, nextReviewAt, 
masteredAt, questionsToFirstMastery, reviewCount.

### AdaptiveProfile
One per profile. Fields: profileId, miniAppStats (Map of miniAppId → 
{ avgQuestionsToMaster, totalTermsMastered, totalTermsAttempted, 
learningVelocity }), globalStats { avgQuestionsToMaster, 
totalCorrectAnswers, totalAnswers, overallAccuracy, currentStreak, 
longestStreak, lastStudiedAt }, masteryThreshold (default: 0.85).

### AnswerRecord
Raw answer capture — every answer a user gives. Fields: profileId, 
questionId, termId, miniAppId, sessionId, responseType, rawResponse, 
selectedOptionIndex, maxPoints, pointsAwarded, isCorrect, gradingMethod 
('exact_match' | 'keyword_match' | 'ai_graded' | 'pending'), 
answeredAt, timeToAnswerMs, wasTimedOut, attemptNumber, wasSkipped, 
confidenceBefore, confidenceAfter.

### QuizSession
Groups answer records. Fields: profileId, miniAppId, quizId (optional — see below), status
('active' | 'completed' | 'abandoned'), questionIds[], settings 
{ questionCount, timeLimit, questionTypes, bucketFilter, feedbackMode,
shuffleQuestions }, results 
{ totalQuestions, answered, skipped, correct, totalPointsAvailable, 
totalPointsAwarded, percentageScore, timeTakenMs }, startedAt, 
completedAt.

`settings` is snapshotted from the parent `Quiz.settings` at session-creation time
(`createQuizSession` in `quizSession.service.ts`), with `overrideSettings` (from
`isUserAdjustable` quizzes) taking priority per-field.
`shuffleQuestions` (default `false`) — when `true`, `createQuizSession` shuffles the final
`questionIds` order (Fisher-Yates) after either the `mode: 'fixed'` quiz's authored order or
the `mode: 'dynamic'` adaptive-priority selection is resolved. No teacher-facing toggle UI
exists yet — schema + logic only, set directly on `Quiz.settings.shuffleQuestions`.
`mode: 'fixed'` question order is preserved by mapping over `quiz.questionIds` rather than
trusting `Question.find({ _id: { $in } })`'s return order, which MongoDB does not guarantee.
`quizId` (added August 2026, backs Quiz History — see the API Routes Reference and Frontend Web
entries below) traces a session back to the `Quiz` it was created from; optional since sessions
created before this field existed have it undefined. Set unconditionally in `createQuizSession`,
so every entry point (a roadmap quiz item's `/start`, Dictionary/pool's default-quiz lookup, and
a direct retake by quizId) populates it the same way.

### Lesson
A pure study-material container — one 'lesson'-type item inside a
RoadmapNode.items[]. Fields: nodeId, roadmapId (denormalized),
position (1-based within node), title, resources[] (ordered — see
IResource below), requireVideoWatch (boolean, default true — mobile-only
video-watch completion gating, teacher-configurable per lesson from
Content Studio's LessonEditorPage; no effect on a lesson with no 'video'
resource either way — see mobile-architecture.md's "Video-watch tracking
→ lesson completion gating" section), isActive.

Quizzes are NOT wrapped in a Lesson — a 'quiz'-type item on
RoadmapNode.items[] references a Quiz document directly (itemId =
Quiz._id). A Lesson never has quizId/passingScore/lessonType; those
concepts moved to the node's item ref (see RoadmapNode below).

IResource (one entry per resources[] element): { type: 'video' | 'pdf' |
'image' | 'notes' | 'audio' | 'steps', position, url? (video/pdf/image/audio),
caption? (video/image/audio), title? (pdf), markdown? (notes),
steps? [{ title?, content }] (steps — a read-only stepped/sliding-notes
viewer, not a quiz), thumbnailUrl? (video), description? (video) }.
`thumbnailUrl`/`description` (added August 2026, Phase B of the Course & Topic redesign) are
optional with no backfill and no authoring UI yet — Studio's resource-editing UI on apps/web
doesn't set them; existing Lesson documents simply have neither field until something writes
them.

### Roadmap
A pure ordered container of nodes, referenced from `Course.roadmapId`. Carries no
subject/miniApp context of its own — that lives on the Course that wraps it.
Fields: title, description, nodes [{ nodeId, position }] — canonical ordered list of nodes,
isActive.

`nodes[]` is the source of truth for node ordering.

### RoadmapNode
A single step on a roadmap path — "Topic" in the UI/dashboard vocabulary. Fields: roadmapId,
title, slug (unique per roadmapId), description, position, type
('lesson' | 'checkpoint' | 'practice'), curriculumTags 
[{ curriculum, gradeLevel }], items [{ itemType: 'lesson' | 'quiz' | 'project', itemId,
position, passingScore?, starThresholds? }], unlockRequires[], linkedCourseIds[] (reserved for
the deferred multi-provider-course feature — always empty today), rewards { xp, peanuts, badge? },
isActive.

`items[]` is heterogeneous and is the canonical ordering array — replaces
the old `lessons[]`. `itemType: 'lesson'` → itemId points to a Lesson
document (pure study material). `itemType: 'quiz'` → itemId points to a
Quiz document directly (no wrapper Lesson); `passingScore` (0–1, minimum score ratio to pass)
and `starThresholds` ([{ minScore, stars }], added August 2026 — see "Quiz grade settings"
below) both live on the item ref itself, not on the Quiz (a Quiz can be reused outside
roadmaps). `itemType` is a plain string union, extensible later to
'resource' | 'notes' | 'chatbot' etc — not built yet. `'project'` (added August 2026, Phase B
of the Course & Topic redesign) is reserved only — no Project model, resolution, or progress
logic exists yet, and no icon asset exists for it; it's assignable on both the TS type
(`NodeItemType` in packages/shared/types/roadmap.ts) and the Mongoose `itemType` enum
(`roadmapNode.model.ts`'s `nodeItemRefSchema` — the two are declared separately and both had to
be updated) but nothing downstream handles it. `itemId` has no
Mongoose `ref` (polymorphic) — resolved manually in roadmap.service.ts by
splitting on itemType and querying Lesson/Quiz separately.

### ProfileRoadmapProgress
Fields: profileId, roadmapId, miniAppId (optional, vestigial — no longer set for new
progress documents now that Roadmap has no miniAppId of its own), nodeProgress 
(Map of nodeId → { status, stars 0–3, attempts, bestScore, lastAttemptAt, 
completedAt, itemProgress (Map of itemId → { status, completedAt, 
attempts, bestScore, studyMaterialViewedAt, lastAttemptAt }) }), 
currentNodeId, totalStars, startedAt, lastActivityAt.
Unique index: profileId + roadmapId.

`itemProgress` is keyed by itemId uniformly whether it points to a Lesson
or a Quiz. First item of a node is set to 'unlocked' when the node is
unlocked. Subsequent items unlock when the previous item is completed.
A 'quiz' item with `passingScore: 0` always passes (reproduces the old
"practice lesson" auto-pass behavior); stars are awarded when the last
item in `items[]` (by position) is passed, using that item ref's
`starThresholds` (teacher-configured via Content Studio's Grade Settings —
see `RoadmapNode.items[]` below and `apps/api/src/utils/gradeSettings.ts`).

### ProfileSubjectEnrollment
One per profile per subject. Fields: profileId, subjectId, fieldId 
(denormalized), enrolledAt, lastAccessedAt, status 
('active' | 'paused' | 'completed'), progressSummary { totalNodes, 
completedNodes, totalItems, completedItems, overallProgressPercent, 
lastActivityAt }.
Unique index: profileId + subjectId.
Indexes: profileId + fieldId, profileId + status.

`progressSummary` is a rollup across **every Course** under the subject (a subject can have
more than one), not a single roadmap — `enrollment.service.ts`'s `enrollInSubject` and
`updateProgressSummary` both iterate `Course.find({ subjectId })` and sum totals/completions
across each course's Roadmap/ProfileRoadmapProgress.

### AiChatMessage
One turn in Course Chat's AI Helper — a 1:1, course-scoped chat between a profile and Claude
Haiku (added August 2026). Fields: profileId, courseId, role ('user' | 'assistant'), content,
createdAt/updatedAt.

Never wrapped in a session — every message is its own document, ordered by createdAt. History
persists indefinitely per profile+course (no reset, no TTL). Two indexes:
`{ profileId, courseId, createdAt: 1 }` (ordered history fetch) and
`{ profileId, role, createdAt: -1 }` (backs a 5s-cooldown + 50-messages/day rate limit, both
per-profile and derived directly from this collection — no separate counter/Redis). See
[docs/product/course-chat-vision.md](docs/product/course-chat-vision.md) for the full feature,
including why Course Chat's other half (Classmates & Teacher) is UI-only pending Phase 3 teacher
accounts + a class/cohort model.

---

## Adaptive Learning Algorithm

### Confidence score (0.0 → 1.0) per term per profile
- Correct answer: `+0.15 * learningVelocity * (pointsAwarded/maxPoints)`
- Wrong answer: `-0.20`
- Mastery threshold: `0.85` (configurable per AdaptiveProfile)
- Mastered terms enter spaced repetition review cycle

### Learning velocity
Ratio of platform average to user average questions-to-master.
Platform average hardcoded at 5 (PLATFORM_AVG_QUESTIONS_TO_MASTER).
`learningVelocity = 5 / userAverage`
Clamped between 0.5 and 2.0.
Recalculated every 10 mastered terms.

### Spaced repetition intervals (reviewCount → days until next review)
0 → +1 day | 1 → +3 days | 2 → +7 days | 3 → +14 days | 4+ → +30 days

### Question selection priority in quiz sessions
1. Terms due for spaced repetition review (nextReviewAt <= now)
2. Active learning terms (lowest confidenceScore first)
3. Unseen terms (in bucket, never answered)

---

## Question Generation System

### Pipeline
```
Term + Definition added to DB
  ↓
Non-AI questions generated immediately (auto)
  ↓
AI questions generated async via Anthropic API (source: 'ai')
  ↓
All questions saved with isGeneric: true
  ↓
Reused across all users who add the same definition
```

### Generation is triggered when a user adds a definition to their bucket
`vocab.service.ts`'s `addToBucket` calls `generateQuestionsForDefinition`
(the same full auto+AI pipeline used by the admin endpoint) fire-and-forget,
but only if no active questions already exist for that term+definition.
Questions are still generic (`isGeneric: true`, `profileId: null`) and
reused across all users who add the same definition — generation is
triggered by the first user to add it, not per-user regeneration.
Can also be triggered manually via the admin endpoint or seed script.

### Non-AI generated questions (source: 'auto')
MCQ-1 (mcq_term_to_def), MCQ-2 (mcq_def_to_term), TF-1 
(true_false_term_def ×2), TF-2 (true_false_def_term ×2), 
TI-1 (text_input_def), TI-2 (text_input_audio — only if audioUrl exists),
MCQ-5 (mcq_fill_blank — if example sentence exists), 
FIB-1 (fill_blank_typed — reuses MCQ-5 sentence),
TI-3 (text_input_example — reuses same sentence)

### AI generated questions (source: 'ai')
MCQ-3 (mcq_correct_usage), MCQ-4 (mcq_incorrect_usage), 
TF-3 (true_false_usage), and conditionally MCQ-5/FIB-1/TI-3 
if no example sentence exists.

### Distractor rules
- MCQ distractors must exclude ALL definitions from the same term
  (not just the current definitionId — all sibling definitions)
- AI prompt must be anchored to the specific definition being tested
  to prevent multi-meaning words (e.g. "bank") generating 
  multiple correct options

### aiGenerationStatus on Term
`'pending' | 'complete' | 'failed' | 'not_needed'`
Max 3 retry attempts. Failed terms can be retried via admin endpoint.

### Admin endpoints
```
POST /api/admin/generate-questions        — trigger for one term+def
GET  /api/admin/generation-status         — monitor by miniAppId
POST /api/admin/retry-failed-generation   — retry all failed terms
```

---

## API Routes Reference

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/select-profile
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/guest      — { displayName?, ageGroup? }; creates a credential-less Account +
                             owner Profile and returns a full access token directly (mobile only
                             today — see docs/technical/guest-mode.md)
POST /api/auth/claim      — { email, password }; requireAccount only (not requireOwner, same
                             precedent as DELETE /auth/account); adds credentials to the calling
                             account without touching profiles/activeProfile
GET  /api/auth/google
GET  /api/auth/google/callback
GET  /api/auth/facebook
GET  /api/auth/facebook/callback
```

### Profile
```
GET    /api/profiles
POST   /api/profiles
GET    /api/profiles/me
PATCH  /api/profiles/me
PATCH  /api/profiles/me/setup
DELETE /api/profiles/:profileId
POST   /api/profiles/:profileId/pin
DELETE /api/profiles/:profileId/pin
GET    /api/profiles/me/stats
```

### Content navigation
```
GET /api/content/fields
GET /api/content/fields/:fieldSlug/subjects
GET /api/content/fields/:fieldSlug/subjects/:subjectSlug
GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/courses
GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/courses/:courseSlug
GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/miniapps
GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/miniapps/:miniAppSlug
```

### Vocabulary
```
GET    /api/vocab/search?word=&miniAppId=
GET    /api/vocab/terms/:termId
POST   /api/vocab/bucket
DELETE /api/vocab/bucket/:termId
GET    /api/vocab/bucket?miniAppId=&status=&page=&limit=
GET    /api/vocab/recent?miniAppId=
GET    /api/vocab/trending?miniAppId=&limit=
GET    /api/vocab/dictionary?miniAppId=&letter=&page=&limit=
GET    /api/vocab/dictionary/alphabet?miniAppId=
```

### Quiz
```
POST  /api/quiz/session                       — { miniAppId | quizId, settings? }; quizId starts/retakes that exact quiz directly, bypassing the miniAppId isDefault lookup
GET   /api/quiz/session/:sessionId
POST  /api/quiz/session/:sessionId/answer
PATCH /api/quiz/session/:sessionId/complete
PATCH /api/quiz/session/:sessionId/abandon
GET   /api/quiz/session/:sessionId/results
GET   /api/quiz/session/:sessionId/review     — full per-question breakdown (question + given answer + correct answer) for a persisted session, reconstructed from AnswerRecord + Question; enriched with the same course/topic context as one quiz-history entry (see below)
GET   /api/quiz/history?contextId=&nodeId=&status=&page=&limit=  — Quiz History list, paginated, filterable by course/mini-app (contextId) and Topic (nodeId)
GET   /api/quiz/history/filters               — course/topic filter dropdown options, scoped to what the profile has actually attempted
```

### Roadmap
```
GET  /api/roadmap/course/:courseId
GET  /api/roadmap/node/:nodeId
GET  /api/roadmap/lesson/:lessonId
POST /api/roadmap/lesson/:lessonId/study
POST /api/roadmap/node/:nodeId/item/:itemId/start
POST /api/roadmap/node/:nodeId/item/:itemId/complete
```

### Enrollment
```
GET    /api/enrollment/subjects
GET    /api/enrollment/subjects/available?fieldSlug=
POST   /api/enrollment/subjects
DELETE /api/enrollment/subjects/:subjectId
GET    /api/enrollment/subjects/:subjectId/progress
GET    /api/enrollment/fields/:fieldSlug/subjects
PATCH  /api/enrollment/subjects/:subjectId/accessed
```

### AI Chat (Course Chat's AI Helper)
```
GET  /api/ai-chat/course/:courseId/history
POST /api/ai-chat/course/:courseId/message   — { message }
```
Both require `requireProfile`; `POST` also runs `attachContentPrefs` (reads
`ageGroup`/`simplifiedLanguage` for the system prompt). Rate-limited per-profile: 5s cooldown
between messages, 50 messages/day. See the `AiChatMessage` entry above and
[docs/product/course-chat-vision.md](docs/product/course-chat-vision.md).

### Admin
```
POST /api/admin/generate-questions
GET  /api/admin/generation-status?miniAppId=
POST /api/admin/retry-failed-generation
```

### Dashboard (Content Studio — platform-admin only)
```
POST /api/dashboard/assets/upload           — multipart: file + type ('images'|'audio'|'video'|'documents')
GET  /api/dashboard/assets?type=&search=    — list/browse assets under question-media/{type}/

POST   /api/dashboard/courses                              — { subjectId, name, slug, description?, curriculumTags? }; also creates the Course's (empty) Roadmap
PATCH  /api/dashboard/courses/:courseId                     — name/description/iconUrl/miniAppIds/curriculumTags only
DELETE /api/dashboard/courses/:courseId                     — soft delete (isActive: false); roadmap/nodes/lessons/quizzes/questions untouched
POST   /api/dashboard/courses/:courseId/nodes               — { title, slug, description?, curriculumTags? }
PATCH  /api/dashboard/courses/:courseId/nodes/reorder        — { nodeIds: string[] } full ordered list; rewrites Roadmap.nodes[] + each RoadmapNode.position

PATCH  /api/dashboard/nodes/:nodeId                          — title/description/curriculumTags/unlockRequires/rewards only
DELETE /api/dashboard/nodes/:nodeId                          — soft delete; removes its entry from Roadmap.nodes[], renumbers the rest
POST   /api/dashboard/nodes/:nodeId/lessons                  — { title, resources: IResource[], requireVideoWatch? }
POST   /api/dashboard/nodes/:nodeId/quizzes                  — { title, settings? }; always mode:'fixed', miniAppId: <course._id>
PATCH  /api/dashboard/nodes/:nodeId/items/:itemId/grade-settings — { passingScore?, starThresholds? }; quiz items only, responds with the item's fully-resolved grade settings (see gradeSettings.ts)

PATCH  /api/dashboard/lessons/:lessonId                       — title/resources/requireVideoWatch only
DELETE /api/dashboard/lessons/:lessonId                       — soft delete; removes its entry from the parent node's items[], renumbers the rest

GET    /api/dashboard/quizzes/:quizId                          — direct Quiz.findById, no course/miniAppId dependency; response is merged with the owning node item's gradeSettings/nodeId (see quiz.controller.ts's getQuizHandler)
PATCH  /api/dashboard/quizzes/:quizId                          — title/settings only (not mode, not miniAppId)
PATCH  /api/dashboard/quizzes/:quizId/questions                — { questionIds: string[] } full ordered replacement; keeps settings.questionCount in sync
DELETE /api/dashboard/quizzes/:quizId                          — soft delete; removes its entry from the parent node's items[], renumbers the rest

POST   /api/dashboard/questions                                — { courseId, type, content, termId?, definitionId?, maxPoints?, pointsCanBePartial? }; always source:'manual', isGeneric:true
PATCH  /api/dashboard/questions/:questionId                     — content/maxPoints/pointsCanBePartial only
DELETE /api/dashboard/questions/:questionId                     — soft delete; warns (doesn't block) if still referenced by an active Quiz.questionIds
GET    /api/dashboard/questions?courseId=&search=                — scoped to one course (miniAppId: courseId); search matches content.prompt, falling back to content.correctAnswer for DnD types
```
All `/api/dashboard/*` routes require `[requireProfile, requirePlatformAdmin]`. Course-flow CRUD
(`apps/api/src/modules/studio/` — one routes/controller/service file per resource: course, node,
lesson, quiz, question) is the second slice of the Content Studio backend, building on Part 1's
auth gate + shared asset library. Every Quiz/Question created here gets `miniAppId` set to the
**Course's `_id`** (no MiniApp document exists for roadmap content) — same convention the
Course/Roadmap migration already established. Every delete across this module is a **soft
delete** — real learner progress can already be attached by the time something gets edited. See
[docs/content/content-studio-design.md](docs/content/content-studio-design.md).

---

## Google Cloud Storage Structure

Bucket: `my-backpack-assets` (region: africa-south1)
Public URL: `https://storage.googleapis.com/my-backpack-assets/[path]`

```
my-backpack-assets/
├── branding/
│   ├── logos/
│   └── icons/
├── wallpapers/
│   ├── 1x1/
│   ├── portrait/
│   └── landscape/            ← light/dark 9x16 wallpaper variants for apps/mobile's theme
│                                system (ASSETS.wallpapers.portraitLight/portraitDark) are
│                                designed in Figma but NOT yet exported/uploaded here — those
│                                two constants are still placeholders, see mobile-architecture.md
├── ui/
│   └── illustrations/
│       └── bucket/          ← bucket/board UI illustrations (planned, not yet populated)
├── illustrations/             ← all illustration assets (avatars, DnD backgrounds, draggables) live under this one prefix
│   ├── avatars/               ← lesson avatar characters, one subfolder per avatarId
│   │   └── miss-tutor/        ← happy.png, sad.png, serious.png, smiling.png
│   ├── drag-areas/           ← full-width backgrounds for the whole DnD widget (draggable tray + drop zone)
│   ├── drop-zones/           ← backgrounds for individual drop zones only — classroom-board.png is the
│   │                            universal default applied to every dnd_single drop zone
│   └── draggables/           ← reusable DnD asset library, organized by theme not subject
│       └── alphabet/
│           └── cartoon-grouped/  ← uppercase+lowercase pairs in one image (from Vecteezy)
├── sounds/
│   ├── isizulu/
│   │   ├── vowels/         ← a.mp3, e.mp3, i.mp3, o.mp3, u.mp3
│   │   ├── questions/      ← khetha-umsindo-a.mp3, etc.
│   │   ├── feedback/       ← correct-a.mp3, try-again.mp3, etc.
│   │   ├── avatar/         ← zoe-drag-a.mp3, etc.
│   │   └── consonants/     ← ba.mp3, be.mp3, … cu.mp3
│   └── english/
│       ├── vowels/         ← a.mp3, e.mp3, i.mp3, o.mp3, u.mp3 (short sounds)
│       ├── questions/      ← pick-sound-a.mp3, etc.
│       └── cvc/            ← cat.mp3, sit.mp3, sun.mp3, etc.
├── content/
│   ├── vocab/
│   ├── math/
│   │   └── objects/        ← apple.png, cabbage.png, car.png, etc.
│   └── english/
│       ├── vowels/         ← card-a.png, card-e.png, etc. (superseded by draggables/alphabet/ for dnd_single)
│       └── cvc/            ← letter tile images
└── question-media/         ← Content Studio dashboard uploads, not manually curated — GCS
    ├── images/               itself is the index (no tracking collection); see
    ├── audio/                docs/design/asset-locations.md
    ├── video/
    └── documents/
```

Shared asset URLs: `packages/shared/constants/assets.ts`

---

## Seed Data System

The seed system lives in `apps/api/src/seed/` and is fully idempotent —
running `pnpm --filter api seed` multiple times updates existing records
rather than creating duplicates, using `findOneAndUpdate` with
`upsert: true`.

Structure:
- `data/` — raw constant data, no DB calls
- `seeders/` — functions that write core content to DB
- `seeders/roadmaps/` — one file per subject's course + roadmap (Course-first pattern — see
  Conventions below)
- `questions/` — one file per subject, contains the actual question
  content. This is where you add or edit individual questions
  (e.g. vowels, basic vocab terms).
- `migrations/` — one-off, non-idempotent-seeder scripts for schema-restructure changes
  against real data. NOT wired into `pnpm seed` — run manually and once, via a dedicated
  `pnpm --filter api migrate:<name>` script. See
  `migrations/2026-07-course-roadmap-restructure.ts` for the canonical pattern (check-before-write
  so it's still safe to re-run if interrupted, back up affected collections first).

To add a new isiZulu vowel: edit `questions/isizulu/vowels.questions.ts`
To add a new isiZulu consonant: edit `questions/isizulu/consonants.questions.ts` (consonantData array)
To add a new English vowel: edit `questions/english/vowels.questions.ts`
To add a new CVC word: edit `questions/english/cvc-words.questions.ts` (wordData array)
To add a new English term: edit `questions/english/vocab-basics.questions.ts`
To add a new math counting question: edit `questions/math/counting.questions.ts`
To add a new drag-intro object: edit `questions/math/drag-intro.questions.ts`
To add a new subject's course + roadmap: create a new file in `seeders/roadmaps/`

You do not need to drop the database before re-running seed — the upsert
pattern handles updates safely. Dropping the DB is still useful after
major schema changes that old documents won't satisfy.

---

## Folder Structure

```
my-backpack/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── config/         # db.ts, redis.ts, passport.ts
│   │       ├── middleware/     # ageGroup.middleware.ts
│   │       ├── models/         # see Model Structure above
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   ├── profile/
│   │       │   ├── content/
│   │       │   ├── vocab/
│   │       │   ├── quiz/
│   │       │   ├── roadmap/
│   │       │   ├── enrollment/
│   │       │   ├── admin/
│   │       │   ├── asset/      # /api/dashboard/assets — Content Studio shared asset library
│   │       │   ├── studio/     # /api/dashboard/{courses,nodes,lessons,quizzes,questions} —
│   │       │   │               # Content Studio course-flow CRUD; one routes/controller/service
│   │       │   │               # file per resource
│   │       │   ├── aiChat/     # /api/ai-chat — Course Chat's AI Helper (routes/controller/
│   │       │   │               # service/types)
│   │       │   └── question/
│   │       │       └── question.types.ts  # IDraggable, IDropZone, IBlank,
│   │       │                              # IFeedback, IAvatarConfig,
│   │       │                              # IQuestionHelpers, defaultHelpers,
│   │       │                              # IQuestionContent, INodeQuestionAssignment
│   │       ├── services/
│   │       │   ├── questionGeneration/
│   │       │   │   ├── index.ts
│   │       │   │   ├── nonAiGenerator.ts
│   │       │   │   ├── aiGenerator.ts
│   │       │   │   ├── questionValidator.ts
│   │       │   │   └── distractorHelper.ts
│   │       │   ├── adaptiveLearning.service.ts
│   │       │   ├── dictionaryApi.service.ts
│   │       │   ├── quizSession.service.ts
│   │       │   └── aiChatHelper.service.ts  # Anthropic Haiku wrapper for Course Chat's AI Helper
│   │       ├── utils/
│   │       │   ├── jwt.ts
│   │       │   ├── response.ts
│   │       │   └── AppError.ts
│   │       ├── scripts/
│   │       │   ├── generateQuestions.ts
│   │       │   └── cleanupQuestions.ts
│   │       ├── seed/
│   │       │   ├── index.ts            # master runner
│   │       │   ├── data/               # raw constant data, no DB calls (fields, subjects, miniapps)
│   │       │   ├── seeders/            # accounts, content hierarchy, roadmaps
│   │       │   │   └── roadmaps/       # Course-first: one file per subject's course + roadmap
│   │       │   ├── questions/          # per-subject question content
│   │       │   │   ├── english/        # vocab-basics, vowels, cvc-words
│   │       │   │   ├── isizulu/        # vowels, consonants
│   │       │   │   └── math/           # drag-intro, counting
│   │       │   └── migrations/         # one-off, non-idempotent-seeder scripts — not
│   │       │                           # wired into `pnpm seed`, run manually and once
│   │       └── app.ts
│   ├── web/
│   │   └── src/
│   │       ├── app/            # Redux store
│   │       ├── components/
│   │       │   ├── auth/       # Input, SocialLoginButtons, 
│   │       │   │               # ProfileCard, PinModal
│   │       │   └── quiz/       # QuestionRenderer, QuizProgress, AnswerFeedback,
│   │       │                   # QuizPageShell (shared no-scroll viewport shell),
│   │       │                   # patterns/ (McqPattern, TrueFalsePattern,
│   │       │                   # TypedInputPattern, DndSinglePattern)
│   │       ├── features/
│   │       │   ├── auth/       # authSlice
│   │       │   ├── theme/      # themeSlice
│   │       │   ├── enrollment/ # enrollmentSlice
│   │       │   ├── subjects/   # subjectsSlice (subjectsByKey, miniAppsByKey — keyed by
│   │       │   │                # `${fieldSlug}/${subjectSlug}`)
│   │       │   ├── courses/    # coursesSlice (coursesByKey, currentCourse — same key)
│   │       │   ├── roadmap/    # roadmapSlice (currentRoadmap/currentNode/currentLesson only)
│   │       │   ├── vocab/      # vocabSlice
│   │       │   ├── quiz/       # quizSlice
│   │       │   ├── aiChat/     # aiChatSlice (Course Chat's AI Helper — messagesByCourseId)
│   │       │   └── studio/     # studioSlice (course/node/lesson/quiz/question CRUD state —
│   │       │                   # one slice, since Content Studio is a single connected
│   │       │                   # authoring flow always navigated course->node->lesson/quiz->
│   │       │                   # question); components/ (AssetPicker, Modal, SortableList,
│   │       │                   # CreateCourseModal, AddNodeModal, CurriculumTagsEditor,
│   │       │                   # DraggableEditor, DropZoneEditor, BlanksEditor,
│   │       │                   # FeedbackEditor, AvatarEditor); questionArchetypes.ts
│   │       │                   # (5-archetype config table for the 16 v1 question types);
│   │       │                   # utils/ (slug.ts, questionPreview.ts)
│   │       ├── lib/            # axios instance
│   │       └── pages/
│   │           ├── LoginPage
│   │           ├── SignupPage
│   │           ├── ForgotPasswordPage
│   │           ├── ResetPasswordPage
│   │           ├── VerifyEmailPage
│   │           ├── SelectProfilePage
│   │           ├── ProfileSetupPage
│   │           ├── dashboard/DashboardPage
│   │           ├── subject/SubjectHomePage    # Course grid (main) + Mini-Apps panel (side) —
│   │           │                              # a Subject can have multiple Courses now
│   │           ├── course/CoursePage          # roadmap for one Course (progress header + RoadmapPath)
│   │           │   ├── CourseChatPage          # Course Chat hub (AI Helper + coming-soon
│   │           │   │                            # Classmates & Teacher tile)
│   │           │   └── CourseChatAiHelperPage  # AI Helper chat
│   │           ├── lesson/LessonPlayerPage, QuizItemPlayerPage
│   │           ├── miniapp/MiniAppPage         # Dictionary sub-routes: term/:termId, bucket, quiz
│   │           └── studio/                    # Content Studio (platform-admin only) — StudioLayout
│   │               │                          # (gate + sidebar), CoursesListPage, CourseDetailPage,
│   │               │                          # NodeDetailPage, LessonEditorPage, QuizEditorPage,
│   │               │                          # QuestionEditorPage — see routes below
│   └── mobile/
│       ├── app/                 # Expo Router file-based routes
│       │   ├── _layout.tsx      # Redux <Provider>, splash-hold-until-bootstrapped, <Slot />
│       │   ├── index.tsx        # ProtectedRoute-gated redirect entry point
│       │   ├── (auth)/          # login, signup — redirects away if already authed
│       │   ├── select-profile.tsx
│       │   ├── profile-setup.tsx
│       │   └── (app)/           # guarded post-auth group (ScreenBackground + ProtectedRoute)
│       │       ├── home.tsx     # enrolled-subjects list, no roadmap UI
│       │       ├── miniapp/[miniAppId]/  # Dictionary: index, term/[termId], bucket
│       │       └── subject/[subjectSlug]/course/[courseSlug]/chat/  # Course Chat
│       │           ├── index.tsx      # hub (ordinary nested route, not fullScreenModal)
│       │           └── ai-helper.tsx  # AI Helper chat
│       ├── src/
│       │   ├── store/store.ts   # Redux store — NEVER rename this dir to src/app/,
│       │   │                    # Expo Router silently prefers src/app/ as its routes
│       │   │                    # root over the real app/ dir if that name is used
│       │   ├── lib/             # api.ts (axios + X-Client-Type: mobile), secureStore.ts, audio.ts
│       │   ├── features/        # auth, content, vocab, quiz, aiChat slices
│       │   ├── theme/           # ThemeContext.tsx — ThemeProvider + useTheme(), light/dark
│       │   │                    # (dark is the default, no persistence/toggle yet)
│       │   └── components/      # GlassCard, PrimaryButton, ScreenBackground, TextField,
│       │                        # ProtectedRoute, dictionary/ (mini-app-specific),
│       │                        # course/ (CourseChatHubScreen, AiHelperChatScreen, ChatBubble)
│       └── metro.config.js      # watchFolders + nodeModulesPaths only — do not add
│                                # resolver.unstable_enableSymlinks / disableHierarchicalLookup,
│                                # both break pnpm's nested transitive-dep resolution on this SDK
├── packages/
│   ├── shared/
│   │   ├── constants/
│   │   │   ├── assets.ts
│   │   │   └── theme.ts        # lightColors/darkColors (IThemeColors) + spacing/radius/
│   │   │                        # typography/fontFamilies/fontWeights — canonical design-token
│   │   │                        # source for both apps/web and apps/mobile; keep in sync with
│   │   │                        # docs/design/brand-guide.md. apps/mobile consumes the colour
│   │   │                        # objects via src/theme/ThemeContext.tsx (dark is the default
│   │   │                        # active theme) and fontFamilies via its own
│   │   │                        # src/theme/fonts.ts weight-name mapping (RN needs the exact
│   │   │                        # expo-font-loaded name, e.g. Fredoka_700Bold — see
│   │   │                        # src/components/AppText.tsx); apps/web reads fontFamilies
│   │   │                        # directly in tailwind.config.ts but still hardcodes Tailwind
│   │   │                        # colour classes, no colour theme system there yet
│   │   └── types/
│           ├── account.ts
│           ├── profile.ts
│           ├── auth.ts
│           ├── content.ts      # IField, ISubject, IMiniApp, ICourseSummary (no Topic anymore)
│           ├── term.ts         # ITerm, IDefinition
│           ├── question.ts     # IQuestion, IQuestionContent, IDraggable,
│           │                   # IDropZone, IBlank, IFeedback, IAvatarConfig,
│           │                   # IQuestionHelpers, defaultHelpers,
│           │                   # INodeQuestionAssignment, QuestionType
│           ├── quiz.ts         # IQuizSession, IAnswerRecord
│           ├── learning.ts     # ILearningRecord, IAdaptiveProfile
│           ├── roadmap.ts      # IRoadmap (no subjectId/miniAppId), IRoadmapNode (slug,
│           │                   # linkedCourseIds), INodeItemRef, ILesson, IResource, IProgress
│           ├── enrollment.ts   # IProfileSubjectEnrollment, IProgressSummary
│           └── aiChat.ts       # IAiChatMessage, IAiChatSendMessageResponse (Course Chat)
│       └── utils/
│           └── resolveHelpers.ts  # resolveHelpers(questionDefaults, nodeOverrides)
│   └── ui/                     # empty placeholder — reserved for a future cross-platform
│                                # component package (web + mobile shared UI); not built yet
├── CLAUDE.md                   ← this file
├── pnpm-workspace.yaml
└── .gitignore
```

---

## Current Progress

### Backend (apps/api)
- [x] Monorepo initialized with pnpm workspaces
- [x] Folder structure and model structure established
- [x] Auth system (Account + Profile models, JWT, Passport, OAuth2)
- [x] Profile module (CRUD, PIN, setup flow)
- [x] Content hierarchy (Field → Subject → MiniApp, with Course[] wrapping roadmap-based
      learning paths under Subject — restructured July 2026, `Topic` removed entirely)
- [x] Vocabulary module (search, bucket management, dictionary, trending)
- [x] Question models and all 13 question types defined
- [x] Question model unified content field (prompt/options/correctAnswer/explanation inside content)
- [x] DnD question types added (dnd_single/select/count/sort/sequence/match/fill/build)
- [x] Helpers system (IQuestionHelpers, defaultHelpers, node helperOverrides, resolveHelpers)
- [x] INodeQuestionAssignment on RoadmapNode.assessment.questionAssignments — **stale**:
      `RoadmapNode.assessment` no longer exists (superseded by the `items[]` restructure below);
      `INodeQuestionAssignment` still exists in `question.types.ts` but is unwired/unused today
- [x] Question generation system (auto + AI via Anthropic Haiku)
- [x] Adaptive learning service (confidence scores, velocity, spaced repetition)
- [x] Quiz session service (create, answer capture, complete, abandon)
- [x] Shuffle support — `IQuestionHelpers.shuffleDraggables` (per-question, DnD pool order) and
      `Quiz.settings.shuffleQuestions`/`ISessionSettings.shuffleQuestions` (per-quiz, question
      order at session-start); both have teacher-facing checkboxes in Content Studio
      (`QuestionEditorPage.tsx` for `shuffleDraggables`, `QuizEditorPage.tsx` for
      `shuffleQuestions`, August 2026). MCQ option order is separate from both of these — it's
      always shuffled client-side now (not a toggle, see the Frontend Web/Mobile entries below)
- [x] DnD answer evaluation (evaluateDnDAnswer in quizSession.service.ts)
- [x] Answer record model (full capture including confidenceBefore/After)
- [x] Roadmap system (Roadmap, RoadmapNode, ProfileRoadmapProgress models)
- [x] Roadmap module (routes, service, unlock logic)
- [x] Lesson model (replaces studyMaterial + assessment on RoadmapNode)
- [x] Roadmap restructured — subjectId optional, nodes[] canonical order
- [x] RoadmapNode restructured — items[] replaces lessons[] (heterogeneous 'lesson'/'quiz' items; quiz items reference Quiz documents directly, no wrapper Lesson)
- [x] Lesson restructured — resources[] (video/pdf/image/notes/audio/steps) replaces the single studyMaterial object; lessonType/quizId/passingScore dropped (moved to the node's item ref)
- [x] ProfileRoadmapProgress — itemProgress replaces lessonProgress (keyed uniformly by itemId)
- [x] Subject enrollment system (ProfileSubjectEnrollment model + enrollment module)
- [x] Roadmap service updated — item-level start/complete/study routes (POST /roadmap/node/:nodeId/item/:itemId/{start,complete})
- [x] Item-complete/lesson-study responses return nextItemId/nextItemType — frontend auto-advances to the next item on pass/complete instead of requiring a manual "back to roadmap" click
- [x] IQuestionHelpers.retryUntilCorrect — DnD wrong drops rejected client-side, never submitted, no skip while active; enabled on all 6 vowels dnd_single quiz variants
- [x] Term.word unique index fixed — now compound (miniAppId + word) not global
- [x] English Phonics content hierarchy (Course + Roadmap seeded)
- [x] Question.seedKey field added — idempotent upsert key for hand-authored seed variants that termId+type can't distinguish (e.g. the 6 vowels dnd_single quiz variants)
- [x] All roadmaps (isiZulu vowels/consonants, English vowels/CVC, math drag-intro/counting) migrated to the items[] model — vowels nodes: 1 lesson item + 6 quiz items; other nodes: 1 lesson item + 2 quiz items (was practice + assessment)
- [x] English Phonics node 2: Three-Letter Words (22 questions: mcq_audio + dnd_build × 11 CVC words)
- [x] Math Number Sense roadmap restructured (2 nodes: drag-intro at pos 1, counting at pos 2)
- [x] Math drag-intro node: 8 practice + 5 assessment dnd_single questions
- [x] Math counting node: 10 dnd_count questions across counts 1–10
- [x] IsiZulu consonants node 2: 20 questions (mcq_audio + dnd_build × 10 syllables, b/c × vowels)
- [x] Admin endpoints (question generation, retry, status)
- [x] Global error handler (AppError, catchAsync)
- [x] AgeGroup content filter middleware
- [x] Email verification flow (nodemailer SMTP transport, token + 24h expiry, resend endpoint)
- [x] Forgot password / reset password email flow (token + 1h expiry, silent on unknown email)
- [x] Course/Roadmap restructure (July 2026) — `Course` model added (wraps one Roadmap, optional
      `miniAppIds[]` convenience links, reserved `team`/curriculumTags); `Topic` model removed
      entirely; `Roadmap` no longer carries subjectId/miniAppId (pure node container); `MiniApp`
      reparented topicId→subjectId, `'roadmap'` dropped from its type enum; `RoadmapNode` gained
      `slug` and reserved `linkedCourseIds[]`; content/roadmap API routes updated
      (`/content/.../courses`, `/content/.../courses/:courseSlug`, `/content/.../miniapps` dropped
      `:topicSlug`, `/roadmap/course/:courseId` replaces `/roadmap/:miniAppId` +
      `/roadmap/subject/:subjectId`); enrollment module reworked to roll up progress across every
      Course under a subject (a subject can now have more than one); one-time migration script
      (`seed/migrations/2026-07-course-roadmap-restructure.ts`) adopts existing Roadmap `_id`s and
      reuses each legacy roadmap-type MiniApp's `_id` as the new Course's `_id` so pre-existing
      Term/Question/Quiz/QuizSession `miniAppId` references keep resolving without a mass data
      migration; established `seed/migrations/` as the convention for future one-off restructure
      scripts. Frontend (web/mobile) not yet updated to match — tracked separately.
- [x] Content Studio backend, part 1 (July 2026) — `isPlatformAdmin: boolean` added to `Profile`
      (default `false`, no granting UI — set directly in MongoDB); `requirePlatformAdmin`
      middleware added (mirrors `requireOwner`); new `/api/dashboard/*` namespace (currently just
      `modules/asset/`) gated by `[requireProfile, requirePlatformAdmin]`; GCS client
      (`config/gcs.ts`, `@google-cloud/storage`) and asset upload/list endpoints
      (`POST /api/dashboard/assets/upload`, `GET /api/dashboard/assets`) backing a new
      `question-media/{images|audio|video|documents}/` GCS root — no tracking collection, GCS
      itself is the index. Foundation for the rest of the Content Studio (course/node/lesson/
      quiz/question authoring), which lands in later prompts — see
      [docs/content/content-studio-design.md](docs/content/content-studio-design.md).
- [x] Content Studio backend, part 2 — course-flow CRUD (July 2026) — `modules/studio/` added
      (one routes/controller/service file per resource: course, node, lesson, quiz, question),
      all mounted under `/api/dashboard/*` alongside Part 1's asset routes, same
      `[requireProfile, requirePlatformAdmin]` gate. Creating a Course also creates its empty
      Roadmap in the same request (rolled back on a slug conflict); every Quiz/Question created
      here gets `miniAppId` set to the **Course's `_id`** (the established convention — no
      MiniApp document exists for roadmap content); Quiz creation is always `mode: 'fixed'` with
      `settings.questionCount` kept in sync with `questionIds.length` rather than editable
      directly. Node/lesson/quiz deletion re-derives `position` for the remaining siblings on
      both sides of the relationship (`Roadmap.nodes[]` + each `RoadmapNode.position` on node
      delete; `RoadmapNode.items[]` + sibling `Lesson.position` on lesson/quiz delete) so the two
      copies of ordering data can't drift — shared via `removeNodeItem`/`findNodeByItemId`
      helpers in `node.service.ts`, reused by `lesson.service.ts` and `quiz.service.ts`. All
      deletes are soft (`isActive: false`) — real learner progress can already be attached.
      Question creation/update relies on `Question`'s existing `pre('validate')` hook for
      per-type content-shape validation (DnD needs draggables/dropZones, non-DnD needs prompt) —
      a failed save surfaces as a 400 rather than being re-validated in the controller. v1
      question authoring is fully manual, no AI-assisted distractor/variant generation (a
      documented future direction, not built). See
      [docs/content/content-studio-design.md](docs/content/content-studio-design.md).
- [x] Course & Topic redesign, Phase B — schema additions (August 2026) — two small, additive
      changes ahead of a new Course page design in Figma; navigation/screens/roadmap rendering
      is Phase C, not touched here. (1) `NodeItemType` gained `'project'` (`'lesson' | 'quiz' |
      'project'`) in both `packages/shared/types/roadmap.ts` and the Mongoose `itemType` enum
      on `roadmapNode.model.ts`'s `nodeItemRefSchema` — these are two separate declarations that
      both needed the literal added, or a project-typed item ref would pass the TS type check but
      fail Mongoose validation. Reserved only — no `Project` model, no `NodeItemWithProgress`
      branch, no resolution/progress logic, no icon asset; nothing downstream handles it yet.
      One unavoidable ripple: both `apps/web/src/components/roadmap/NodeLessonsPanel.tsx` and
      its mobile counterpart keyed a `Record<NodeItemType, {...}>` display-label lookup table,
      which TypeScript requires to be exhaustive — each gained a placeholder `project: { label:
      'Project', ... }` entry purely to keep `tsc` green; no node ever has a `'project'` item
      today so it's unreachable, and neither file's actual `itemType === 'lesson' ? ... : ...`
      navigation branching was touched.
      (2) `IResource` (Lesson `resources[]`) gained optional `thumbnailUrl`/`description`, primarily
      meaningful for `type: 'video'` — added to the shared flat interface (not split into
      type-specific sub-interfaces, matching the existing "flat, optional-fields schema" pattern)
      and mirrored into `lesson.model.ts`'s `resourceSchema`. No backfill, no authoring UI yet —
      existing Lesson documents simply have neither field until Studio's resource-editing UI is
      extended to set them (not done here).
- [x] Quiz Modes backend — `Quiz.mode: 'pool'` (August 2026) — a third `Quiz.mode` alongside
      `'dynamic'`/`'fixed'`: selects a random slice of every active `Question` scoped to the
      quiz's `miniAppId`, no bucket, no pinned list (`selectPoolQuestions` in
      `quizSession.service.ts`). One `isDefault:true, mode:'pool'` Quiz is now auto-created per
      Course (`studio/course.service.ts`'s `createCourse`); existing courses backfilled via
      `seed/migrations/2026-08-quiz-modes-pool.ts`. Backs mobile's Quiz Modes "Game Quizzes".
      Also added: `Quiz.assignedPlayMode` (default `null`, superseded a since-removed
      `allowPlayModes: boolean` — see the redesign entry below) — a teacher's fixed assignment
      of exactly one Quiz Mode + its settings to a `mode:'fixed'` Topic quiz, set from Content
      Studio; not read for `'dynamic'`/`'pool'` quizzes. Full detail under Frontend Mobile's
      "Quiz Modes" entry below.
- [x] Course Chat — AI Helper backend (August 2026) — new `AiChatMessage` model
      (`models/learning/`) and `modules/aiChat/` (routes/controller/service/types, mounted at
      `/api/ai-chat`, same thin-controller pattern as `modules/vocab/`). New
      `services/aiChatHelper.service.ts` reuses the exact `@anthropic-ai/sdk` /
      `claude-haiku-4-5-20251001` setup from `questionGeneration/aiGenerator.ts`, but — since
      this call is synchronous/user-facing rather than fire-and-forget — wraps it in a try/catch
      mapping any failure to a 503, and uses the SDK's `system` parameter for a proper multi-turn
      shape instead of `aiGenerator.ts`'s single-shot embedded-instructions style. Rate limiting
      (5s cooldown + 50 messages/day, both per-profile) is derived directly from the
      `AiChatMessage` collection's own timestamps rather than a new Redis/counter — neither
      Upstash Redis (configured in `config/redis.ts` but unused anywhere else in this codebase)
      nor a per-user rate limiter had any existing precedent here to build on. A send-message
      turn only persists the user's message and the AI's reply together, after the Anthropic
      call succeeds — never an orphaned user message with no reply. This is the AI Helper half
      of Course Chat; the Classmates & Teacher half is UI-only (no backend) — see
      [docs/product/course-chat-vision.md](docs/product/course-chat-vision.md) for why.
- [x] Quiz grade settings (August 2026) — a quiz item's `passingScore` (existing field, was
      previously seed-only with no authoring UI) and a new `starThresholds`
      (`{ minScore: number; stars: number }[]`, both on `INodeItemRef`/`nodeItemRefSchema` in
      `roadmapNode.model.ts`, mirrored in `packages/shared/types/roadmap.ts`) are now
      teacher-editable from Content Studio's `QuizEditorPage.tsx` ("Grade Settings" section: a
      pass-percentage field + three star-tier percentage fields for 1★/2★/3★). New
      `apps/api/src/utils/gradeSettings.ts` centralizes the fallback scale
      (`defaultStarThresholds`, reproducing the old hardcoded 100%→3★/85%→2★/passingScore→1★
      behavior exactly when a quiz item has no custom thresholds — no data migration needed) and
      `computeStars(scoreRatio, passingScore, starThresholds)`, which
      `roadmap.service.ts`'s `completeQuizItem` now calls instead of the old inline if/else
      chain. New write endpoint `PATCH /api/dashboard/nodes/:nodeId/items/:itemId/grade-settings`
      (`node.service.ts`'s `updateNodeItemGradeSettings`, quiz items only — validates
      `passingScore`/`minScore` are 0–1 and `stars` is a 0–3 integer) responds with the item's
      fully-resolved settings, not the whole node. Read side: rather than a second endpoint,
      `GET /api/dashboard/quizzes/:quizId` (`quiz.controller.ts`'s `getQuizHandler`) now merges
      in `nodeId`/`gradeSettings` by looking up the owning node via the existing
      `findNodeByItemId` helper — QuizEditorPage already fetches the quiz by id, so this avoids
      a second round-trip. Frontend state: `studioSlice.ts`'s `currentQuiz` is now `IQuizDetail`
      (`IQuiz & { nodeId, gradeSettings }`); `updateQuiz`/`updateQuizQuestions`'s fulfilled
      reducers merge onto the existing `currentQuiz` object (their PATCH responses don't include
      `nodeId`/`gradeSettings`) rather than replacing it outright, or the Grade Settings section's
      prefill would silently blank out on every ordinary "Save settings" click. Stars are still
      only awarded when the node's last item is passed (unchanged structural rule) — a custom
      scale whose lowest tier sits above `passingScore` can now award 0 stars on a passing score
      that doesn't clear it, a deliberate widening from the old "always at least 1 star if
      passed" guarantee, since that's what a teacher who sets it that way is asking for.
- [x] Quiz History backend (August 2026) — a profile's past quiz attempts were previously
      unreconstructable server-side: `QuizSession` had no way to trace back to the `Quiz`/Topic it
      came from, and no endpoint could rebuild a "question + given answer + correct answer"
      breakdown for a *persisted* session (the existing per-question breakdown was built entirely
      from ephemeral in-session Redux state — see the Frontend Web entry below). `QuizSession`
      gained an optional `quizId` field (see the model entry above), set unconditionally in
      `createQuizSession` so every entry point populates it; new
      `apps/api/src/modules/quiz/quizHistory.service.ts` (kept separate from
      `quizSession.service.ts`'s lifecycle logic and `quiz.service.ts`'s Quiz-definition reads,
      since it's the only place that needs to join across Course/MiniApp/Subject/Field/
      RoadmapNode) exports `listQuizHistory` (paginated, filterable by `contextId` — a Course or
      MiniApp `_id` — and `nodeId`/Topic), `getHistoryFilterOptions` (course/topic dropdown
      options scoped to what the profile has actually attempted, via `QuizSession.distinct`), and
      `getEntryContext` (the single-session version of the same enrichment, used to attach
      course/topic context to a review response). New `getSessionReview` in
      `quizSession.service.ts` (alongside `getSessionResults`/`getSessionState`) zips
      `AnswerRecord`+`Question` docs in the session's authored `questionIds` order, marking a
      question `attempted: false` if the learner never reached it (e.g. an abandoned session) —
      the review data itself stays in the lifecycle file; only the course/topic enrichment lives
      in `quizHistory.service.ts`, merged in in the controller (same "controller assembles the
      final response shape" pattern as `studio/quiz.controller.ts`'s `getQuizHandler`). Resolving
      a `miniAppId` to a Course vs. a MiniApp (no existing helper did this) tries `Course.findById`
      first, falling back to `MiniApp` — the same "Course id space, no MiniApp document for
      roadmap content" convention used throughout. Retake support piggybacks on the existing
      `POST /api/quiz/session`: it now accepts an optional `quizId` that starts/retakes that exact
      quiz directly, skipping the `miniAppId` + `isDefault` lookup the endpoint previously
      required (which only ever resolved a mini-app's *default* quiz, not an arbitrary roadmap
      Topic quiz). See the API Routes Reference above for the three new/changed routes.
- [x] Guest mode backend (August 2026) — `Account.isGuest: boolean` (default `false`) +
      `IAuthProvider` gained `'guest'`; `POST /api/auth/guest` (`createGuestAccount` in
      `auth.service.ts`, modeled on `upsertOAuthAccount`) creates a credential-less Account +
      owner Profile (`isSetupComplete: true` at creation — the dateOfBirth/education step is
      deferred, not asked) and returns a full access token directly, skipping the
      partial-token/select-profile round trip; `POST /api/auth/claim` (`requireAccount`, not
      `requireOwner` — same precedent as `DELETE /auth/account`) later adds `email`/`password`
      to that same account and flips `isGuest` back to `false` without touching
      `profiles`/`activeProfile`. Every existing `requireProfile`-gated route needed zero
      changes — it only checks `Account.findById`/`Profile.findById`, never credential
      presence — confirmed against the real dev database (guest created → second profile
      added, 6-profile cap intact → a real quiz session started/lifecycle-completed → claim
      flipped `isGuest` off → re-claim correctly rejected), not new code; see
      [docs/technical/guest-mode.md](docs/technical/guest-mode.md)'s "Verification performed"
      for the full run and one unrelated pre-existing issue it surfaced. `isGuest` is joined onto every client-facing profile shape
      (`ProfileSummary`, `IProfile`) from the parent `Account` at the point each is built
      (`toProfileSummary` in both `auth.service.ts`/`profile.service.ts`; `GET /profiles/me`,
      `PATCH /profiles/me`, `PATCH /profiles/me/setup` via a `withIsGuest()` controller helper
      reading the already-loaded `req.account`) — it isn't stored on `Profile` itself. A second,
      stricter rate limiter (20/hour) sits on `/api/auth/register` and `/api/auth/guest`
      specifically, layered on top of the existing blanket `authLimiter`. Mobile-only for now —
      `apps/web` has no guest entry point yet. See
      [docs/technical/guest-mode.md](docs/technical/guest-mode.md).
- [ ] XP and peanuts reward system (deferred)
- [ ] Test readiness scoring (deferred)
- [ ] Book/PDF upload pipeline (deferred)
- [ ] AI-powered content generation from books (deferred)

### Frontend Web (apps/web)
- [x] React + Vite + TypeScript + Redux setup
- [x] Tailwind CSS configured
- [x] Axios instance with interceptors
- [x] React Router configured
- [x] Auth pages (Login, Signup, ForgotPassword, ResetPassword, 
      VerifyEmail, SelectProfile)
- [x] Profile setup page
- [x] Dashboard skeleton
- [x] Vocab mini-app UI (search, term detail, dictionary)
- [x] Bucket UI (My Bucket page — status filter tabs, client-side sort, confidence/accuracy/review info, remove)
- [x] Quiz UI (12 text-based question types + dnd_single implemented via DndSinglePattern; remaining 7 dnd_* types and mcq_audio show a "not yet supported" placeholder)
- [x] Roadmap UI (roadmap screen with node panel, lesson resource-hub page with video/pdf/image/notes/audio/steps rendering, direct quiz-item player reusing the Quiz mini-app's components)
- [x] Course/Roadmap frontend restructure (July 2026) — `SubjectHomePage` now lists Courses (grid,
      main content) + Subject-level MiniApps (flat side panel, renamed from "Topics" to
      "Mini-Apps"); new `CoursePage` (`/subject/:subjectSlug/course/:courseSlug`) owns the
      per-Course roadmap (progress header + `RoadmapPath`, moved from the old `SubjectHomePage`)
      plus a quick-links row for the Course's linked MiniApps (`Course.miniAppIds`, when
      populated); lesson/quiz-item routes gained a `:courseSlug` segment
      (`/subject/:subjectSlug/course/:courseSlug/lesson/:lessonId` and
      `.../node/:nodeId/quiz/:itemId`); `/field/:fieldSlug/subject/:subjectSlug/miniapp/...`
      routes dropped their `:topicSlug` segment; `roadmapSlice` replaced
      `fetchRoadmapBySubject`/`fetchRoadmapByMiniApp`/`fetchSubjectTopics` with
      `fetchCoursesBySubject`/`fetchMiniAppsBySubject`/`fetchCourseBySlug`/`fetchRoadmapByCourse`;
      removed unused flat `pages/DashboardPage.tsx` and `pages/HomePage.tsx` leftovers (the real
      ones live at `pages/dashboard/DashboardPage.tsx`, routed from `main.tsx`)
- [x] Age-group-aware DnD/quiz-chrome styling — `DndSinglePattern`, `QuizProgress`, `AnswerFeedback` take an `ageGroup` prop and render a distinct child-mode glassmorphism treatment (large glass prompt bubble + stacked replay/hint buttons, clamp-sized draggable tiles, flex-1 drop zone) alongside the unchanged adult/teen default; see [docs/design/child-dnd-quiz-style.md](docs/design/child-dnd-quiz-style.md)
- [x] No-scroll viewport contract for the active-question view — shared `QuizPageShell` (`apps/web/src/components/quiz/QuizPageShell.tsx`) locks `QuizPage`/`QuizItemPlayerPage` to `h-[calc(100dvh-60px)]` (accounts for AppLayout's 60px TopNav) with `overflow-hidden`; the active question region is `flex-1 min-h-0 overflow-hidden` so a 5-draggable `dnd_single` question never forces scrolling, while start/results/error/loading states keep their natural scrollable-if-needed treatment
- [x] Live TTS with word highlighting (interim) — `SpokenText` component (browser Web Speech API via `react-text-to-speech`) reads question prompts, avatar dialogue, and answer feedback aloud with manual playback; always defers to prerecorded audio where it exists; see [docs/content/live-tts-word-highlighting.md](docs/content/live-tts-word-highlighting.md)
- [x] `roadmapSlice` split into three properly-scoped slices (July 2026) — new `apps/web/src/features/subjects/subjectsSlice.ts` (`subjectsByKey`/`miniAppsByKey`, `fetchSubjectBySlug`/`fetchMiniAppsBySubject`) and `apps/web/src/features/courses/coursesSlice.ts` (`coursesByKey`/`currentCourse`, `fetchCoursesBySubject`/`fetchCourseBySlug`) took over everything that wasn't actually roadmap-scoped; `roadmapSlice` now only holds `currentRoadmap`/`currentNode`/`currentLesson` + `fetchRoadmapByCourse`/`fetchLesson`. Both new caches key by `` `${fieldSlug}/${subjectSlug}` `` (never bare `subjectSlug`) since `Subject.slug`/`Course.slug` are only unique per-field/per-subject. New backend route `GET /api/content/fields/:fieldSlug/subjects/:subjectSlug` (`getSubjectBySlug` in `content.service.ts`) backs `fetchSubjectBySlug`, letting `SubjectHomePage` read the subject header from `subjectsByKey` instead of the enrolled-subjects list — though `fieldSlug` itself still has to come from matching `enrollment.enrolledSubjects` first, since the `/subject/:subjectSlug` route carries no `:fieldSlug` segment; not fixed by this change. `Breadcrumb.tsx` updated to read `courses`/`currentCourse` from the new `coursesSlice`.
- [x] "Take Quiz" entry point on the Dictionary page — `main.tsx` gained a `/field/:fieldSlug/subject/:subjectSlug/miniapp/:miniAppSlug/quiz` route (mirrors the existing `/bucket` sub-route), `MiniAppPage`'s `type === 'dictionary'` branch renders `QuizPage` when the path ends in `/quiz`, and `DictionaryPage` got a "Take Quiz" button next to "My Bucket". Closes out the "quiz access folds into Dictionary" item from the Course/Roadmap restructure — the Vocabulary Quiz MiniApp was deleted and its `Quiz` documents re-pointed at Dictionary's `miniAppId` during that migration, but no UI entry point existed until now. `QuizPage` itself needed no changes — it's already generic on `{miniApp, subjectSlug}` and resolves correctly now that `miniAppId` points at Dictionary.
- [x] Content Studio frontend (July 2026) — the full course-authoring flow, gated to
      `activeProfile.isPlatformAdmin` (`StudioLayout` redirects to `/dashboard` otherwise, mirroring
      `ProtectedRoute`'s pattern). New routes, all nested under the existing protected
      `AppLayout` group: `/studio/courses` (list, "+ New Course"), `/studio/courses/:courseId`
      (meta edit + linked mini-apps + node list with drag-to-reorder), `/studio/nodes/:nodeId`
      (meta edit + items[] list, "+ Add Lesson"/"+ Add Quiz" create an empty draft and navigate
      straight into it), `/studio/lessons/:lessonId` (title + ordered `resources[]` editor, one
      form per resource type), `/studio/quizzes/:quizId?courseId=&nodeId=` (settings +
      drag-to-reorder question list, "+ Add Question" pick-existing/create-new chooser), and
      `/studio/questions/new?courseId=&returnTo=&addToQuiz=` /
      `/studio/questions/:questionId?courseId=` (type dropdown grouped by the 5 form
      archetypes from `docs/content/content-studio-design.md`, driving a per-archetype config
      table in `questionArchetypes.ts` — not a 21-type or 16-type switch; client-side validation
      mirrors the `Question.pre('validate')` hook exactly). One `studioSlice.ts` covers all
      course/node/lesson/quiz/question state (see folder structure above) — deliberately not
      split like `subjectsSlice`/`coursesSlice`, since this is one connected authoring flow
      always navigated in the same order, unlike those two which serve independently-reused
      learner-facing pages. `AssetPicker` (`features/studio/components/`) is the one
      upload-or-browse component used everywhere a GCS path is needed (question media, lesson
      resources, avatar/feedback audio) — Upload posts to `/api/dashboard/assets/upload`, Browse
      reads `/api/dashboard/assets?type=&search=`, and by default stores a GCS **path**, never a
      full URL — except Lesson resources, an opt-in exception added later (see the entry below).
      Reads mostly reuse existing endpoints rather than adding new dashboard GETs (per the design
      doc's read/write split) — course list is aggregated client-side from
      `/content/fields` → `.../subjects` → `.../courses` (no "all courses" endpoint exists);
      a course's node list comes from `GET /roadmap/course/:courseId`; a node's resolved items
      from `GET /roadmap/node/:nodeId`; a lesson from `GET /roadmap/lesson/:lessonId`; a quiz's
      full settings/questionIds from `GET /quiz/quizzes?miniAppId=<courseId>` (found by id
      client-side, since no dashboard GET for a single quiz exists); a question for prefill/edit
      from `GET /dashboard/questions?courseId=` (same reasoning — `courseId` travels as a query
      param on every question-editor link specifically so this works). Divergences from the
      original build plan are noted in `docs/content/content-studio-design.md`.
- [x] Lesson resource URLs + mobile video data-usage guardrails (August 2026) — `IResource.url`
      (video/image/audio/pdf entries on `Lesson.resources[]`) now stores the **full GCS URL**
      directly, a deliberate exception to the path convention every other asset reference follows
      (`IDraggable.imageUrl`, `IFeedback.audioUrl`, question content fields, `Course.iconUrl`,
      etc. — those are unchanged). Reason: the Lesson Player on both web
      (`LessonPlayerPage.tsx`) and mobile (`LessonVideo.tsx`, `[lessonId].tsx`) already read
      `resource.url` as ready-to-use and always have, with no path-resolution logic on the
      render side — adding that there would mean duplicating `resolveAssetUrl()`-equivalent
      logic into a page that doesn't have it, so the fix went on the authoring side instead.
      `AssetPicker` gained an opt-in `returnFullUrl` prop (default unset/false — every other
      caller is unaffected); only the two `AssetPicker` instances in `LessonEditorPage.tsx` that
      edit Lesson resources pass it. See `docs/design/asset-locations.md` for the full
      exception writeup. Also landed in this pass: `apps/mobile/src/components/lesson/
      LessonVideo.tsx` no longer connects a video source on mount — `expo-video`'s player starts
      buffering as soon as a source is connected, even while paused, which silently spent mobile
      data before the learner chose to watch anything. The player now starts with a null source
      and a tappable glassmorphism placeholder card; tapping calls `player.replace(url)` +
      `player.play()`, with a loading spinner and a retry-capable error state driven by
      `useEvent(player, 'statusChange', ...)` from `'expo'` plus a 15s defensive timeout (see
      `docs/technical/mobile-architecture.md`'s "Lesson video: deferred buffering" section — the
      timeout exists because `statusChange` has documented cases of never firing `'error'` for a
      bad source). Web got the same fix in one attribute — `LessonPlayerPage.tsx`'s `<video>`
      gained `preload="none"`. Backend guardrails added alongside: `POST
      /api/dashboard/assets/upload` now caps uploads at 250MB (`multer`'s `limits.fileSize` in
      `asset.routes.ts`, a single blanket cap across all four asset types for simplicity; an
      error-handling middleware right after `upload.single()` turns multer's `LIMIT_FILE_SIZE`
      into a normal 400 via `sendError()` instead of an unhandled 500), and every GCS upload now
      sets `Cache-Control: public, max-age=31536000, immutable` (`asset.service.ts`) — safe
      because every upload path embeds a `Date.now()` timestamp, so a given path's content never
      changes.
- [x] Content Studio — course-wide Question Bank (August 2026) — new "Question Bank" section on
      `CourseDetailPage.tsx`: lists/searches every question scoped to the course
      (`searchCourseQuestions`, already existed) with a "+ Add Question" link to
      `/studio/questions/new?courseId=` **with no `addToQuiz` param** — `QuestionEditorPage.tsx`
      already skipped the quiz-attach step when that param was absent, but until now nothing in
      the app linked to it that way; every other question-creation link goes through a specific
      Quiz's "+ Add Question" modal, which always passes `addToQuiz`. First real "Delete
      question" button too (`deleteQuestion` existed in `studioSlice.ts`, previously unwired to
      any button anywhere). No new thunks/routes/backend endpoints — purely wiring an existing
      capability into a reachable screen. Backs mobile's Quiz Modes "Game Quizzes" pool — see
      Frontend Mobile's "Quiz Modes" entry below and
      [docs/content/content-studio-design.md](docs/content/content-studio-design.md).
- [x] Course Chat (August 2026) — new "Course Chat" button on `CoursePage.tsx` (between the
      progress bar and the linked-MiniApps row), new routes
      `/subject/:subjectSlug/course/:courseSlug/chat` (`CourseChatPage`, hub — AI Helper tile
      enabled, Classmates & Teacher tile visibly disabled with a "🔜 Coming soon" badge — no
      backend, model, or real-time infra built for that half; see
      [docs/product/course-chat-vision.md](docs/product/course-chat-vision.md)) and `.../chat/
      ai-helper` (`CourseChatAiHelperPage`). New `aiChatSlice.ts` mirrors `quizSlice.ts`'s
      conventions, state keyed by `courseId`. Optimistic send: the learner's message renders
      from local `pendingText` state immediately, replaced by the confirmed
      `{userMessage, assistantMessage}` pair from Redux on success, left with an inline retry
      chip on failure. Both new pages re-derive `course` from Redux (`coursesByKey`/
      `currentCourse`, with the same direct-link fallback fetch `CoursePage.tsx` already uses)
      rather than receiving it via route params, since React Router's `:courseSlug` segment
      doesn't carry extra data the way Expo Router's `router.push({ params })` does.
- [x] Quiz-taking bug fixes + Content Studio shuffle toggles (August 2026) — five small,
      independent fixes to the quiz-taking flow, shipped together:
      (1) **Stale selected-answer bug** — `McqPattern.tsx`/`TrueFalsePattern.tsx` never reset
      their `selected` state between questions (unlike `TypedInputPattern.tsx`/DnD patterns,
      which already did via a `useEffect` keyed on `content`); tapping into a second
      same-type question showed the previous question's selection still highlighted. Both now
      reset on `content` change, matching the existing pattern elsewhere.
      (2) **MCQ options always shuffled client-side** — `McqPattern.tsx` shuffles
      `content.options` once per question load (same local-per-file Fisher-Yates convention as
      `DndSinglePattern.tsx`'s `shuffle()`); safe because grading matches `rawResponse` text
      against `content.correctAnswer` (`quizSession.service.ts`), never option index —
      `selectedOptionIndex` sent to the backend just describes the shuffled position the
      learner tapped, for analytics only.
      (3) **Topic name during a roadmap quiz** — `QuizItemPlayerPage.tsx`'s `QuizPageShell`
      previously had no title at all; now shows the RoadmapNode ("Topic") title above the quiz,
      read from `state.roadmap.currentRoadmap` (already populated by `CoursePage` before
      navigating here — no extra fetch). Mobile's `QuizSessionScreen.tsx` header previously
      showed the humanized **course** slug for a roadmap-item session — now prefers the actual
      topic title from the same Redux source, falling back to the humanized course slug only
      when `currentRoadmap` isn't loaded (e.g. a cold deep link).
      (4) **`AnswerFeedback` centered** — both apps' modal restructured from an icon-left/
      text-left row into a centered column (icon → headline → points → feedback text →
      correct-answer → explanation, all centered); the "Next question"/"Finish" button also got
      explicit center text-alignment. Mobile's `SpokenText` usages needed a `containerStyle`
      override (`spokenRow: { width: '100%', justifyContent: 'center' }`) since its internal
      text element uses `flex: 1` and otherwise wouldn't get a definite width to center within
      once pulled out of the old `flex: 1` sidecar column.
      (5) **Content Studio shuffle toggles** — `QuestionEditorPage.tsx` gained a
      "Shuffle draggable pool order" checkbox (DnD types only) that round-trips the question's
      full `content.defaultHelpers` object, not just `shuffleDraggables` — a plain question-editor
      edit no longer silently drops other helper overrides a seed script set (e.g.
      `retryUntilCorrect`). `Quiz.settings.shuffleQuestions`'s checkbox already existed on
      `QuizEditorPage.tsx` prior to this pass.
- [x] Quiz History (web only, August 2026) — new "Quiz History" button on both `CoursePage.tsx`
      (chip under the "Course Chat" button, `?contextId=<course._id>`) and
      `DictionaryPage.tsx` (third chip in the existing My Bucket/Take Quiz row,
      `?contextId=<miniApp._id>`), opening a global (not course/subject-nested) screen at
      `/quiz-history` covering **every** quiz type — roadmap Topic quizzes and Dictionary
      quizzes together, per the product decision to keep history in one place rather than split
      per-context. New `features/quizHistory/quizHistorySlice.ts` (list/filters/pagination +
      a nested per-session `review` slot) and `features/quizHistory/quizHistoryLinks.ts`
      (`getRetakePath`, shared by the list and the review screen since both carry the same
      course/topic context shape). Three new pages under `pages/quizHistory/`:
      `QuizHistoryPage.tsx` (filter row styled after `BucketPage.tsx`'s status-tab + `<select>`
      convention — Completed/Abandoned/All pills, course `<select>`, topic `<select>` scoped to
      the selected course — entry cards with score badge, Review, and Retake, Prev/Next
      pagination), `QuizHistoryReviewPage.tsx` (**read-only** review — every question in session
      order with given vs. correct answer, points, explanation; the "Your answer" line is
      skipped for DnD types, matching how `QuizResults.tsx`'s existing breakdown already treats
      them, since a DnD `rawResponse` is a JSON placements blob, not human-readable), and
      `QuizHistoryPlayPage.tsx` (a trimmed copy of `QuizPage.tsx`'s active-question loop, reusing
      the same `QuestionRenderer`/`QuizProgress`/`AnswerFeedback`/`QuizResults` components, that
      starts immediately via a new `startSessionByQuizId` thunk on `quizSlice.ts` instead of
      showing `QuizStartScreen` — the fallback retake target for an entry with no roadmap node,
      e.g. a course pool-mode session with no Topic, likely taken via mobile's Quiz Modes).
      Retake deliberately does **not** introduce a fourth session-lifecycle path for the common
      cases — a roadmap Topic quiz retakes through the existing `/subject/.../node/:nodeId/
      quiz/:quizId` route (`QuizItemPlayerPage`, full progress/unlock tracking intact, since the
      item is already unlocked from having been completed once) and a Dictionary quiz retakes
      through the existing `/miniapp/.../quiz` route (`QuizPage`) — only the true fallback case
      uses the new player. Per-attempt review is only possible at all because
      `getSessionReview` reconstructs it server-side from persisted `AnswerRecord`+`Question`
      docs — the live in-session breakdown (`quizSlice.ts`'s `answeredQuestions`) is ephemeral
      Redux state, lost on navigation/refresh, and was never a source Quiz History could read
      from. Mobile was explicitly out of scope for this pass — see the Backend entry above.
- [x] Brand fonts — Fredoka + Nunito Sans, app-wide (August 2026) — see the Conventions section's
      "Two brand fonts" entry and `packages/shared/constants/theme.ts`'s `fontFamilies` for the
      cross-app source of truth. web-specific part: `@fontsource/fredoka` +
      `@fontsource/nunito-sans` (self-hosted, no external Google Fonts request — matches
      apps/mobile's `@expo-google-fonts/*` "bundled, not CDN" approach) installed and imported in
      `src/index.css`; `tailwind.config.ts`'s `fontFamily.sans`/`fontFamily.display` read
      `fontFamilies` from the shared package directly. Because Tailwind Preflight sets
      `font-family` on `html` from `theme('fontFamily.sans')`, Nunito Sans becomes the whole
      app's body font with **zero component changes** — this is the one advantage apps/web has
      over apps/mobile here (see that app's own entry below for why it needs a wrapper
      component instead). Fredoka is applied the same zero-touch way, via a `@layer base` rule
      in `index.css` targeting every `h1`-`h6`; nothing web-specific needed touching beyond
      those three files. See `docs/design/brand-guide.md`'s Typography section.
- [ ] Profile management screens

### Frontend Mobile (apps/mobile)
- [x] Expo scaffold (SDK 57, RN 0.86, React 19.2 at time of writing), Expo Router, monorepo/Metro wiring
- [x] Backend mobile-auth support — refresh token returned in-body for `X-Client-Type: mobile`, stored in `expo-secure-store`
- [x] Theme tokens (`packages/shared/constants/theme.ts`) + base UI primitives (GlassCard, PrimaryButton, ScreenBackground, TextField)
- [x] Auth screens (login, signup, select-profile with PIN keypad, profile-setup) + guarded route tree (ProtectedRoute ported from web)
- [x] Minimal Home screen — enrolled-subjects list now navigates to a per-subject screen
      (Courses grid + flat MiniApps section) instead of listing MiniApps inline
- [x] Dictionary mini-app (search, trending, A-Z browse with pagination, recent searches, term detail, add-to-bucket, bucket management)
- [x] EAS Build configured (eas.json — preview profile produces installable APK with production API URL baked in; production profile produces Play Store AAB)
- [x] Roadmap UI (July 2026) — Subject screen (Courses grid + MiniApps), Course screen
      (progress header + `RoadmapPath`, winding-SVG child mode / card-list adult mode,
      `NodeLessonsPanel` bottom sheet), Lesson player (all 6 resource types: video via
      `expo-video`, image, audio, notes/steps via `react-native-markdown-display`, pdf via
      `Linking.openURL`), roadmap/content slices (`roadmapSlice`, `contentSlice` extended
      with `fetchCoursesBySubject`/`fetchCourseDetail`) — **superseded by the Course & Topic
      redesign, Phase C entry below (August 2026)**: the child/adult split, `RoadmapNodeCard`/
      `RoadmapNodeCircle`, `NodeLessonsPanel`, and the dedicated lesson player route are all
      gone, replaced by one flattened per-item path + `LessonModal`. Left here for history;
      don't reintroduce any of the file names in this bullet
- [x] Quiz UI, 13 of 20 question types (July 2026) — full-screen `quiz/[itemId]` route
      (root layout converted `<Slot/>` -> `<Stack/>` for this one route's
      `presentation: 'fullScreenModal'`), `quizSlice` (scoped to what the roadmap quiz-item
      flow actually uses — no generic `/quiz/session` support), 12 text-based question types
      (`QuestionRenderer`/`QuizProgress`/`AnswerFeedback`/`QuizResults` +
      Mcq/TrueFalse/TypedInput patterns) plus `dnd_single` (hand-rolled on
      `react-native-gesture-handler` + Reanimated, not a library — see
      [docs/technical/mobile-architecture.md](docs/technical/mobile-architecture.md)'s DnD
      section for why `react-native-reanimated-dnd` was evaluated and rejected). The
      remaining 7 `dnd_*` types + `mcq_audio` show the same placeholder web shows for them.
      **The `dnd_single` gesture interaction (accept/reject/
      tap-audio) had not been confirmed on a real device or emulator** at the time — verified
      only via `tsc` and a clean `expo export` bundle. Confirmed working on a physical device
      in the next entry below.
- [x] Quiz UI, question types 14–16 of 20 + Dictionary quiz entry point (July 2026) —
      `dnd_single`'s gesture interaction (accept/reject/tap-audio) **confirmed working on a
      physical device**, unblocking the two DnD additions below. `mcq_audio` added to
      `McqPattern`'s options-list UI (reuses `TypedInputPattern`'s `audio:`-prefix affordance,
      simpler here since `mcq_audio` is exclusively hand-curated seed content, never
      auto-generated, so it always follows the prefix with no `termId`-fallback branch to
      port). `dnd_build` (build a word letter-by-letter into N blanks,
      `content.dropZones[]`-per-blank) and `dnd_count` (drag a quantity of items into one zone,
      `content.draggables[].quantity` expanded into individual tile instances client-side) both
      extend `dnd_single`'s `Gesture.Pan()`/`Gesture.Tap()` + `measureInWindow()` foundation via
      a newly extracted shared tile primitive (`components/quiz/patterns/DndTile.tsx`) rather
      than rewriting it; `DndSinglePattern.tsx` itself is untouched. Both new patterns let a
      placed tile be tapped to remove it back to the pool (dnd_single's placed tile never
      needed this — its `autoSubmit` fires the instant the one slot fills); `dnd_count` always
      shows an explicit Submit button and doesn't read `helpers.autoSubmit` at all (no per-drop
      "landing" moment to hang it off), even though the seed content sets that field per
      question. The remaining 5 `dnd_*` types (`dnd_select`/`dnd_sort`/`dnd_sequence`/
      `dnd_match`/`dnd_fill`) stay on the placeholder — no seeded content exists for any of
      them (matches web's own scope), so building renderers now would be speculative.
      Dictionary's "Take Quiz" button (`app/(app)/miniapp/[miniAppId]/index.tsx`) opens a new
      root-level `quiz/dictionary/[miniAppId]` route; the session-lifecycle/question-rendering
      UI previously inline in `quiz/[itemId].tsx` is now a shared `QuizSessionScreen` component
      taking a discriminated `{ source: 'roadmapItem' | 'miniApp' }` prop, so both routes are
      thin wrappers around one implementation. `quizSlice` gained `startMiniAppQuizSession`
      (`POST /quiz/session` with `{ miniAppId }`, no settings screen — mobile doesn't port
      web's `QuizStartScreen` customize flow); it shares `pending`/`fulfilled`/`rejected`
      reducers with `startQuizItemSession` via `isAnyOf` matchers. No backend changes needed —
      `POST /quiz/session` and `GET /quiz/has-content` already existed. See
      [docs/technical/mobile-architecture.md](docs/technical/mobile-architecture.md)'s
      "Question types 14–20 & Dictionary quiz" section for full detail.
- [x] Live TTS (July 2026) — question prompts, DnD avatar dialogue, and answer feedback are now
      read aloud on demand via `expo-speech` (not `expo-edge-speech` — that wraps an
      unofficial, network-dependent Edge cloud-TTS API not worth taking on for an interim
      layer; see the design doc for the full tradeoff), ported from web's `SpokenText`/
      `useSpeak` rules (`docs/content/live-tts-word-highlighting.md`), not its library
      (`react-text-to-speech` wraps the browser Web Speech API — no RN equivalent). New shared
      primitives: `src/lib/lang.ts` (`subjectSlugToLangCode`, ported unchanged),
      `src/lib/useSpeak.ts` (imperative hook wrapping `expo-speech`'s callback API),
      `src/components/quiz/SpokenText.tsx` (bound-text + speaker-icon component).
      `QuestionRendererProps` gained a required `lang: string`, computed once per session in
      `QuizSessionScreen.tsx` (`subjectSlugToLangCode(session.subjectSlug)` for roadmap items;
      hardcoded `'en-US'` for the Dictionary path — no isiZulu dictionary is seeded yet).
      **Accepted regression from web: no live word-by-word highlighting** — `expo-speech` has
      no word-boundary callback to drive it, so `SpokenText` is a plain speaker icon with no
      in-text highlighting. **One deliberate divergence from web**: `DndSinglePattern`/
      `DndBuildPattern`/`DndCountPattern`'s dialogue Replay button plays `dialogueAudioUrl`
      first when set and only falls back to live TTS when it's absent — web always speaks
      dialogue live regardless of `dialogueAudioUrl` (an explicit call justified by
      word-highlighting, which mobile doesn't have, so that override doesn't carry over here).
      Per-tile draggable-audio tap/drag-start got the ordinary fallback (`item.audioUrl` wins,
      TTS of `item.label` fills the gap) in all three DnD patterns; `DndTile.tsx` itself wasn't
      touched since it already delegates tap outcome entirely to its caller — the fallback
      lives in each pattern's local `playItemAudio` helper instead.
      `IQuestionHelpers.countingAudio` (new, no web reference — web has no `dnd_count`) now
      speaks the running placed-count as a bare numeral on every successful landing in
      `DndCountPattern`, alongside the existing "N placed" text label. See
      [docs/technical/mobile-architecture.md](docs/technical/mobile-architecture.md)'s
      "Live TTS (Prompt 3)" section for full detail.
- [x] Lesson video deferred buffering (August 2026) — `LessonVideo.tsx` no longer connects a
      video source on mount (`useVideoPlayer(null)`); a tappable glassmorphism placeholder card
      replaces the `VideoView` until the learner taps play, avoiding the mobile-data cost of
      `expo-video` buffering a source it hasn't been asked to play yet. See the Content Studio
      entry above and
      [docs/technical/mobile-architecture.md](docs/technical/mobile-architecture.md)'s "Lesson
      video: deferred buffering" section for full detail.
- [x] Light/dark theme system, Phase A (August 2026) — `packages/shared/constants/theme.ts`'s
      single `colors` export split into `lightColors`/`darkColors` (both typed against a new
      explicit `IThemeColors` interface, since two separate `as const` objects would otherwise
      infer incompatible literal-string types); new `apps/mobile/src/theme/ThemeContext.tsx`
      (`ThemeProvider` + `useTheme()`) wraps the root `_layout.tsx` inside the Redux
      `<Provider>` — **dark is the default and only active theme, no persistence or
      user-facing toggle yet** (no Settings screen exists to host one). Every one of the ~40
      mobile files that statically imported `colors` now calls `const { colors } = useTheme()`
      instead; any `StyleSheet.create` referencing `colors` moved out of module scope into a
      `createStyles(colors)` function called inside the component body (module-scope
      `Record<Status, {...}>` colour lookup tables became `getXStyles(colors)` functions for
      the same reason). `ScreenBackground.tsx` now picks its wallpaper by theme via two new
      `ASSETS.wallpapers.portraitLight`/`portraitDark` constants — **both are placeholder
      values today**, not real GCS URLs (the light/dark wallpapers are designed in Figma but
      not yet exported/uploaded); `ImageBackground` fails silently on the bad `uri`, falling
      back to a flat `colors.background` fill. This phase did not touch the Course/Roadmap
      content model or navigation — purely the colour-token/theme-provider layer. See
      [docs/technical/mobile-architecture.md](docs/technical/mobile-architecture.md)'s
      "Light/dark theme system" section for full detail.
- [x] Course & Topic redesign, Phase C — flattened Course path + Lesson/Resources modals (August
      2026) — implements the redesigned Course page from Figma (file OaE5PxSOT5p8Fby7SUpoP7,
      node 22:27039), a pure rendering/navigation change (Roadmap → Nodes → Items was already
      flat — see `packages/shared/types/roadmap.ts`). `RoadmapPath.tsx` now renders one
      `NodeButton` (`src/components/roadmap/NodeButton.tsx`, new) per **item** across every node
      in position order — not one card/circle per node — inserting each node's title as a
      non-tappable section banner at the start of its run of items, and a node-level "N stars"
      summary once after a completed node's last item (`INodeProgressEntry.stars` — node-level
      data, not per-item; `NodeButton` itself has no star-count prop). Figma has only one flat
      layout (Light/Dark theme variants, no separate Adult-mode frame), so **both**
      `RoadmapNodeCard.tsx` (adult/teen card list) and `RoadmapNodeCircle.tsx` (child winding
      path) are deleted, along with `NodeLessonsPanel.tsx` (the old node-tap bottom sheet) and
      the dedicated `course/[courseSlug]/lesson/[lessonId].tsx` route — `RoadmapPath` no longer
      takes an `ageGroup` prop. Tapping a lesson item now opens `LessonModal`
      (`src/components/course/LessonModal.tsx`, new, ~90%-height sheet) instead of navigating to
      a route; tapping a quiz item is unchanged (still navigates straight to `/quiz/[itemId]`).
      `LessonModal`'s "Mark As Completed" (violet/`primary.dark`, exact Figma colour) posts to
      the same `/roadmap/lesson/:lessonId/study` endpoint the old lesson screen used, then
      **closes the modal and returns to the path** rather than auto-advancing into the next
      item's modal — the whole path is visible now, so the learner taps the next unlocked node
      themselves (a deliberate behavior change from the old auto-advance-with-a-1.5s-pause
      flow). `ResourcesModal.tsx` (new, same file location/tab pattern) aggregates every
      lesson's video resources across the **whole course**, grouped by node title as a section
      header ("Lesson Content: {node title}") — reads straight off
      `RoadmapWithProgress.nodes[].items[].lesson.resources` (already fully populated by
      `GET /roadmap/course/:courseId`, confirmed by reading `roadmap.service.ts` directly), no
      new API call. Both modals' Videos tabs reuse `LessonVideo.tsx` (extended with two new
      optional props, `thumbnailUrl`/`description` — Phase B's `IResource` fields — rendered as
      the deferred-buffering placeholder's background image and title/description text; the
      placeholder itself was rebuilt on a plain `View` instead of `GlassCard`, since `GlassCard`'s
      centering relies on its content shrink-wrapping, which doesn't hold once a full-bleed
      thumbnail image is added as a child). Both modals' Notes tabs are a placeholder only —
      "No available notes for this lesson." + a disabled "Add notes" button — Figma only
      designed the Videos state; a real notes UI and its authoring path are out of scope here.
      Three new floating action buttons (`CoursePathActions.tsx`, new) sit pinned to the
      bottom of the Course screen: Resources (rose/`error` — opens `ResourcesModal`), Quizzes
      and Mini-apps (violet/`primary` and a fixed dark/cream pair respectively — both open a
      "Coming soon" placeholder, matching the Dictionary mini-app's existing pattern, since the
      quiz-modes screen these will eventually open isn't built yet). **Note on Figma's own
      variant naming**: the Resources button's underlying Figma component variant is literally
      named `"Lesson"` (the component's default), not `"Resources"` — confirmed by its
      position/icon (a monitor/video-content glyph) alongside the unambiguous `"Quiz"` and
      `"MiniApp"` variants, not assumed from the name. No real Figma vector icon assets were
      pulled in for `NodeButton`/`CoursePathActions` (Figma's icons are custom SVG
      illustrations) — every other icon in this app's roadmap UI already comes from
      `lucide-react-native`, so the closest lucide glyphs (`MonitorPlay`, `ClipboardCheck`,
      `Gamepad2`, `Video`, `BookOpen`) are used instead of introducing a new bundled-illustration
      pipeline for a handful of icons. `NodeButton`'s `locked`/`current` progress treatments
      (dim + `Lock` icon; `primary.light` ring) are carried over from the retired
      `RoadmapNodeCircle.tsx`'s own convention, not sampled from a Figma instance — the Figma
      mockup has every item already completed, so no locked/current instance exists there to
      pull exact values from. Verified via `tsc --noEmit` (clean) and a clean `expo export
      --platform android` bundle (3912 modules) — **not yet confirmed on a real device or
      emulator**, per this project's established "flag what's unverified" convention (see the
      `dnd_single` entries above). See
      [docs/technical/mobile-architecture.md](docs/technical/mobile-architecture.md)'s "Course &
      Topic redesign, Phase C" section for full detail.
      **Addendum (August 2026): video-watch tracking → lesson completion gating** —
      `LessonModal`'s "Mark As Completed" was an unconditional tap; a lesson with at least one
      `'video'` resource now requires actually watching it first (a lesson with none is
      unchanged). `LessonVideo.tsx` gained an optional `onWatched?: () => void`, fired at most
      once per mount (`hasFiredRef` guard) via two new `useEventListener` (from `expo`)
      subscriptions on top of its existing `useVideoPlayer(null, ...)`/`useEvent` setup:
      `playToEnd` (primary signal) and `timeUpdate` (backstop, ≥90% of duration —
      `player.timeUpdateEventInterval = 1` set once in the player's setup callback, persisting
      across the later `player.replace(url)` call). No anti-scrub enforcement, no custom video
      controls. `LessonModal.tsx` tracks watched state per video resource in a
      `Set<number>` keyed by `resource.position`; once every video is watched it calls the
      existing `handleMarkCompleted()` automatically (no tap), showing a "Watch the video to
      continue" hint (reuses the file's existing `emptyText` style) until then, plus a 90s
      fallback timer that reveals a manual "Continue anyway" link if a watched-event never
      resolves. `roadmapSlice.ts`'s `fetchLesson` thunk now also threads through `progress`
      (already returned by `getLessonWithProgress` but previously dropped) into a new sibling
      `currentLessonProgress: IItemProgressEntry | null` field, so revisiting an
      already-`completed` lesson skips all gating — free playback/review, no button, nothing to
      re-watch. `ResourcesModal.tsx` (course-wide video browsing, no lessonId/completion concept)
      needed no changes — `onWatched` is optional and that call site simply doesn't pass it. No
      backend or shared-type changes; `apps/web`'s lesson player is untouched. Verified via
      `tsc --noEmit` (clean) — not yet confirmed on a real device/emulator. See
      [docs/technical/mobile-architecture.md](docs/technical/mobile-architecture.md)'s
      "Video-watch tracking → lesson completion gating" subsection for full detail.
      **Second addendum (August 2026): real-device follow-up** — real-device testing of the above
      surfaced a bug and two requests. (1) **Bug**: native `VideoView` controls (pause/resume/
      fullscreen) were untappable during playback — `LessonVideo.tsx`'s translucent `isLoading`
      overlay had no `pointerEvents` set and silently absorbed touches whenever `statusChange`
      failed to reach `'readyToPlay'` (a flakiness this file's own comment already documented),
      even though the video was visibly playing underneath it. Fixed with `pointerEvents="none"`
      on that overlay plus a new `onFirstFrameRender` callback (a direct native "a frame actually
      drew" signal) that permanently retires the overlay regardless of what `status` does
      afterward; `nativeControls`/`fullscreenOptions={{ enable: true }}` are now also passed
      explicitly (matching the library's own defaults, just documented). (2) **Watched
      indicator**: `LessonVideo.tsx` gained a `watched?: boolean` prop showing a small green
      `CheckCircle` badge (`pointerEvents="none"`) once a video's been watched — independent of
      gating, so it still reflects real progress even on a lesson where gating is off. (3)
      **Teacher opt-out**: new `Lesson.requireVideoWatch: boolean` (`lesson.model.ts` +
      `packages/shared/types/roadmap.ts`, default `true` — Mongoose applies the default on read,
      no backfill needed). `LessonModal`'s gating (hidden button/auto-fire/fallback link) now
      only applies when `videoResources.length > 0 && (currentLesson?.requireVideoWatch ?? true)`;
      unchecking it per-lesson restores the plain always-tappable button. Editable from Content
      Studio's `LessonEditorPage.tsx` — a checkbox shown only when the draft has a `'video'`
      resource — round-tripped through `studioSlice.ts`'s `CreateLessonInput`/`UpdateLessonInput`
      and the matching server-side `lesson.service.ts` interfaces; `PATCH
      /api/dashboard/lessons/:lessonId` now accepts `requireVideoWatch` alongside title/resources.
      Deliberately opt-**out**, not opt-in (an explicit choice — see the doc link below) — every
      pre-existing lesson with video content keeps the just-shipped gating behavior by default.
      Verified via `tsc --noEmit` across `apps/api`/`apps/web`/`apps/mobile` (all clean) — the
      controls fix and opt-out are not yet re-confirmed on a real device. See
      [docs/technical/mobile-architecture.md](docs/technical/mobile-architecture.md)'s same
      subsection (extended) for full detail.
- [x] Shared `Menubar` + select-profile dark-mode fix (August 2026) — `src/components/Menubar.tsx`
      (new) ports Figma's "Menubar" component (back chevron + caps label on the left, Peanuts/XP/
      profile-avatar cluster on the right — the same Figma frame Phase C's research pulled) and
      replaces the bespoke back-button row every screen was rolling on its own: Course screen,
      Subject screen, Dictionary home, term detail, and Bucket. Peanuts/XP are fixed placeholders
      (`'0'`, not wired to real data — the reward system is schema-only, see "XP and peanuts
      reward system" above); the profile avatar is **not** a placeholder — it reads
      `state.auth.activeProfile.displayName` directly (same initials helper as
      `select-profile.tsx`'s `ProfileTile`), since that data already exists — **superseded by
      the "Functional Menubar profile switcher + DiceBear avatars" entry below**, which made
      the avatar tappable and swapped the plain initials circle for a DiceBear image. Dictionary
      home's
      "Take Quiz"/"My Bucket" buttons moved out of the old back-button row into their own row
      below `Menubar` (`Menubar`'s right side is reserved for the Peanuts/XP/avatar cluster, not
      arbitrary action buttons). Also fixed while in this area: `select-profile.tsx`'s PIN-entry
      modal card and profile tiles had `backgroundColor: '#fff'` hardcoded from before the Phase A
      theme conversion — invisible in dark mode, since `colors.text.primary` (cream, `#fcfded`) on
      a hardcoded white card reads as washed-out near-white/pale-yellow text. Both now use
      `colors.background`. See
      [docs/technical/mobile-architecture.md](docs/technical/mobile-architecture.md)'s "Shared
      Menubar" section for full detail.
- [x] Quiz Modes (August 2026) — a Quiz Mode Select screen (grid of mode cards: Classic/Hearts/
      Time Run/Streak/Perfect/Endless/Survival, later joined by an 8th, Mastery — see below)
      sits ahead of the existing quiz-taking flow for all three entry points: Dictionary's
      "Take Quiz", a roadmap quiz item (superseded for Topic quizzes by the teacher-assigned
      redesign below), and the
      Course screen's "Quizzes" FAB (previously "Coming soon" — now opens a `QuizPickerModal`
      course-wide picker with two tabs: "Course Quizzes", the original per-node quiz list, and
      "Game Quizzes", the mode grid embedded directly in the tab). Shipped in two passes — the
      first was UI/component structure only (mode grid, settings modal, navigation wiring, no
      gameplay); this entry now covers the second pass, which made it real: **question
      sourcing** and **gameplay mechanics** are two independent, orthogonal changes.
      - **Sourcing** — new `Quiz.mode: 'pool'` (alongside `'dynamic'`/`'fixed'`,
        `packages/shared/types/quiz.ts` + `quiz.model.ts`'s enum, both updated) selects a
        random slice of every active `Question` scoped to the quiz's `miniAppId` — no bucket,
        no pinned list (`selectPoolQuestions` in `quizSession.service.ts`, mirroring
        `studio/question.service.ts`'s `listQuestions` query shape). One `isDefault:true,
        mode:'pool'` Quiz (`"{Course} Practice Pool"`, `isUserAdjustable:true`,
        `settings.questionCount:200` — a deliberate v1 "request more than any real pool has"
        sentinel, not a real "give me everything" query) is now auto-created per Course
        (`studio/course.service.ts`'s `createCourse`, alongside the existing auto-created empty
        Roadmap) — existing courses backfilled via
        `seed/migrations/2026-08-quiz-modes-pool.ts` (`pnpm --filter api
        migrate:quiz-modes-pool`). This is what makes "the questions for every game come from
        one pool of course questions, added by the teacher in Studio" real:
        `POST /api/dashboard/questions { courseId, ... }` (no `nodeId`/`quizId`) already
        supported quiz-less, course-scoped questions before this pass — the gap was purely a
        missing Studio UI to reach it (see the Content Studio entry below) and a missing
        session-sourcing mode to actually serve them. `quiz.service.ts`'s `hasQuizContent` also
        needed an explicit third branch — it previously treated any non-`'fixed'` mode as
        `'dynamic'` (a bucket check), which would have silently reported `false` for every pool
        quiz. Mobile's Game Quizzes tab now targets `{source:'miniApp', miniAppId: courseId}`
        directly (the same shape Dictionary's "Take Quiz" already used) instead of its previous
        "quick-play the first roadmap item" placeholder.
      - **Gameplay mechanics** — hearts/timer/streak/mistake-limit/perfect-run rules are
        universal: a client-side layer in `QuizSessionScreen.tsx` that works the same whether
        the underlying session is a curated roadmap-lesson quiz or a course's pool quiz, since
        `completeSession` already supported ending a session early (results are computed from
        actually-answered questions, not from the originally-planned count) — no backend model
        change was needed for the mechanics themselves, only for sourcing. `hearts`/
        `mistakeLimit` never reach the API — only `questionCount`/`timeLimit`/`feedbackMode`/
        `shuffleQuestions` do (`quizPlayModes.ts`'s `toSessionSettingsOverride`); the chosen
        mode + settings cross the mode-select → session-route navigation boundary as one
        JSON-encoded `play` param (`encodePlayModeParam`/`parsePlayModeParam`). The new
        mode-rule effect runs before the pre-existing `feedbackMode:'end'` auto-advance effect
        in source order and, when it ends a run early, sets a ref (not state — both effects
        capture their closures from the same commit, so only a ref is read fresh enough to
        prevent the second effect from also firing a conflicting advance/complete) before the
        second effect's guard checks it. A small HUD (hearts remaining / mistakes so far /
        streak / time left) renders in-session, and `QuizResults` gained an optional `banner`
        prop ("Out of hearts!", "Time's up!", "Best streak: 4", …). Backend DTO gap fixed along
        the way: `apps/api/src/modules/quiz/quiz.types.ts`'s local `CreateSessionDto` was
        missing `shuffleQuestions` even though the service layer already supported it.
      - Settings-pill interactivity still derives from `target.source === 'miniApp'` standing
        in for `Quiz.isUserAdjustable` — now correctly `true` for both Dictionary's quiz and
        every course's pool quiz, `false` for roadmap-item quizzes, with no new API field.
      - Two bugs found while building this, not fixed (out of scope for this pass, flagged
        instead): `QuizSessionScreen.tsx`'s post-quiz auto-advance still targets
        `.../course/[courseSlug]/lesson/[lessonId]`, a route the Course & Topic redesign Phase C
        removed in favour of `LessonModal` — that auto-advance branch is dead code today (found
        during the first, UI-only pass). Verified via `tsc --noEmit` (backend, web, mobile all
        clean) and a clean mobile `expo export --platform android` — not yet confirmed on a
        real device/emulator, nor against a real Atlas database (the migration script and the
        new pool-mode session-creation path have only been read-reviewed and type-checked, not
        run end-to-end).
      - Content Studio (web) gained a "Question Bank" section on `CourseDetailPage.tsx` —
        lists/searches every question scoped to the course (`searchCourseQuestions`, already
        existed) with a "+ Add Question" link to `/studio/questions/new?courseId=` **with no
        `addToQuiz` param** — that page already skipped the quiz-attach step when the param was
        absent, but no UI anywhere linked to it that way before now. First real "Delete
        question" button too (`deleteQuestion` existed in `studioSlice.ts`, previously unwired
        to any button).
      - **Correction (August 2026): Topic quizzes no longer show Quiz Mode Select by
        default** — superseded by the teacher-assigned-mode redesign directly below, which
        replaced the `allowPlayModes: boolean` opt-in this bullet originally introduced. Left
        here for history: the "grid always shows" decision was wrong for `mode: 'fixed'`
        roadmap/node quizzes, so a `Quiz.allowPlayModes` field (default `false`) gated the grid
        per quiz, teacher-controlled from a checkbox on `QuizEditorPage.tsx`.
      - **Redesign (August 2026): teacher assigns one specific mode, learner just plays.**
        The opt-in above still let the *learner* pick which of 7 modes to play once a teacher
        turned the grid on; that wasn't quite what a Topic quiz needed — a teacher grading a
        lesson wants to choose the mode too, not just whether one is offered. `Quiz.allowPlayModes`
        was replaced outright with `Quiz.assignedPlayMode: { id, settings } | null` (default
        `null`) — `QuizEditorPage.tsx`'s checkbox became a "Quiz Mode" dropdown (all 8 modes,
        see the Mastery entry below) plus that mode's one settings control, sourced from a new
        shared catalog (`packages/shared/constants/quizPlayModes.ts` — `QUIZ_PLAY_MODES`,
        `getQuizPlayMode`, `formatModeSettingPill`, `IAssignedPlayMode`; the single source of
        truth both `apps/web`'s dropdown and `apps/mobile`'s mode grid/settings-modal now read,
        replacing what used to be a mobile-only, icon-bearing local file — mobile's
        `quizPlayModes.ts` now re-exports the shared catalog and layers only
        `lucide-react-native` icons + Expo Router param helpers on top locally). When a mode is
        assigned, tapping the quiz on mobile (the path, `QuizPickerModal`'s "Course Quizzes"
        tab, or the Course screen) routes straight to `/quiz/[itemId]` with that assignment
        JSON-encoded into the same `play` param a learner-chosen mode always used
        (`encodeAssignedPlayMode` in `quizPlayModes.ts`) — **no mode-select screen is ever shown
        for a Topic quiz**, assigned or not. `QuizModeSelectScreen` narrowed to miniApp-only
        (Dictionary/pool "Game Quizzes" are still learner-chosen, unchanged) and
        `app/quiz/modes/[itemId].tsx` (the old roadmapItem wrapper route) was deleted as dead
        code. `IQuizItemSummary` (`packages/shared/types/roadmap.ts`) carries `assignedPlayMode`
        in place of the old boolean, populated the same way (`roadmap.service.ts`'s node-item
        resolution). No migration needed — Mongoose returns `assignedPlayMode: null` for
        pre-existing documents, identical in effect to the old `allowPlayModes: false` default.
      - **New mode: Mastery** (`QuizPlayModeId: 'mastery'`) — pass by answering correctly a set
        number of times **in a row** (`streakTarget`, default 5, options 3/5/7/10), not by
        overall score. A wrong answer resets the streak to zero but never ends the run (unlike
        every other early-ending mode); running out of questions before reaching the target
        doesn't end it either — the run quietly reshuffles and repeats. Implemented in
        `QuizSessionScreen.tsx` as **chained `QuizSession` documents**, not one long session: an
        exhausted-but-not-yet-mastered leg is finalized via the ordinary `completeSession` call
        (its answers are already real, already persisted) while a `masteryContinuingRef` flag
        suppresses the results screen and the roadmap item-complete gating call for that
        intermediate leg (shown to the learner as a brief "Reshuffling questions…" spinner
        instead), then a fresh session silently starts on the same quiz — reshuffled if the
        teacher enabled `Quiz.settings.shuffleQuestions`. Reaching the target mid-leg is a
        genuine finish, handled exactly like Hearts/Perfect's existing early-end pattern. No
        backend changes were needed for the looping mechanic itself — `completeSession`/
        `startQuizItem` are just called more than once per learner-visible "run"; the roadmap
        gating call only ever sees the *final* leg's score (a deliberate v1 simplification, not
        an aggregate across every leg).
      - See [docs/technical/mobile-architecture.md](docs/technical/mobile-architecture.md)'s
        "Topic quizzes: teacher-assigned mode" and "Mastery mode" sections and
        [docs/content/content-studio-design.md](docs/content/content-studio-design.md) for full
        detail.
- [x] Course Chat (August 2026) — a new "Chat" floating action button on the Course screen,
      added to `CoursePathActions.tsx`'s existing bottom-right FAB stack, directly above the
      Mini-apps FAB (same two-tone outer/inner FAB styling as the other three; emerald/success
      colour pairing, since there's no Figma source for this one to match — see that file's
      module comment). Tapping it opens a hub (`chat/index.tsx` →
      `CourseChatHubScreen`) with two tiles: **AI Helper** (live — `chat/ai-helper.tsx` →
      `AiHelperChatScreen`, a 1:1 course-scoped chat with Claude Haiku) and **Classmates &
      Teacher** (visibly present, non-interactive, "🔜 Coming soon" badge — no teacher accounts
      or class/cohort model exist yet; see
      [docs/product/course-chat-vision.md](docs/product/course-chat-vision.md) for the full
      product reasoning). Both new routes are **ordinary nested routes inside `(app)`**, not
      root-level `fullScreenModal` registrations like `quiz/[itemId].tsx` — being a distinct
      routed screen (not an in-place `<Modal>` like `LessonModal`/`QuizPickerModal`) already
      satisfies "full screen, not a modal" without touching the root `_layout.tsx`'s `<Stack/>`
      config. This is also the first real nested dynamic sub-route under `course/[courseSlug]/`
      since the Course & Topic redesign, Phase C removed the old `lesson/[lessonId].tsx` route in
      favour of `LessonModal` — everything else at that level is a modal, not a route.
      `courseId`/`courseName` are passed as router params directly from the Course screen's
      button rather than re-derived from Redux on the new screens. New `aiChatSlice.ts` mirrors
      `quizSlice.ts`'s conventions (`rejectWithValue` + shared `extractErrorMessage`,
      string-union status), state keyed by `courseId`. `AiHelperChatScreen` does an optimistic
      send (learner's bubble renders from local state immediately, reconciled with Redux once the
      server responds, left with an inline retry chip on failure) and threads `ageGroup` down for
      child-mode styling (bigger touch targets, `typography.bodyChild`), same pattern as
      `QuizSessionScreen.tsx`. New `src/components/course/ChatBubble.tsx` (shared bubble). See
      [docs/technical/mobile-architecture.md](docs/technical/mobile-architecture.md)'s "Course
      Chat" section for full detail. Verified via `tsc --noEmit` and a clean `expo export
      --platform android` — **not yet confirmed on a real device/emulator or against a live
      Anthropic call/Atlas database**, per this project's established "flag what's unverified"
      convention.
- [x] Quiz-taking bug fixes (August 2026) — mobile's half of the cross-app pass documented under
      Frontend Web's "Quiz-taking bug fixes + Content Studio shuffle toggles" entry above:
      `McqPattern.tsx`/`TrueFalsePattern.tsx` reset their `selected` state on question change
      (previously carried a prior selection into the next same-type question);
      `McqPattern.tsx` always shuffles `content.options` client-side (imports the existing
      `shuffle()` from `./DndTile.tsx`, matching `DndBuildPattern.tsx`/`DndCountPattern.tsx`'s
      own import of it); `QuizSessionScreen.tsx`'s header now prefers the roadmap Topic
      (RoadmapNode) title over the humanized course slug for a `roadmapItem` session, read from
      `state.roadmap.currentRoadmap`; `AnswerFeedback.tsx` restructured to a centered column.
- [x] Quiz History (mobile, August 2026) — the mobile half of the Quiz History feature
      documented under Frontend Web's own entry above (backend is fully shared/platform-agnostic,
      not touched again here except one addition — see below). New "Quiz History" entry points:
      a text link (`History` icon + label) under the subheading on `QuizModeSelectScreen.tsx`
      (Dictionary's "Take Quiz" and, via `QuizPickerModal`'s "Game Quizzes" tab, a course's
      practice pool), and the same link below the tab bar on `QuizPickerModal.tsx` (the "Quizzes"
      FAB's modal on the Course screen) — deliberately **not** a third tab alongside "Course
      Quizzes"/"Game Quizzes", since a tab that immediately closes the modal and navigates away
      would look broken mid-selection; both close the modal/screen and route to
      `/(app)/quiz-history?contextId=<miniAppId|courseId>`. New `features/quizHistory/
      quizHistorySlice.ts` ports web's slice 1:1 (same thunks/state shape, swapped onto `api`'s
      `ApiResponse<T>` unwrap convention). Two new **ordinary nested routes inside `(app)`**
      (`app/(app)/quiz-history/index.tsx`, `[sessionId].tsx`) — same reasoning as Course Chat's
      hub: a browsing screen, not a full-screen quiz player, so it doesn't need a root-level
      `fullScreenModal` registration like the quiz-player routes. The list screen ports
      `BucketScreen.tsx`'s status-tab convention for Completed/Abandoned/All, but swaps `<select>`
      (a web-only element) for horizontally-scrollable chip rows for the course and topic
      filters — RN has no native equivalent. The review screen is a straight port of web's
      breakdown UI (`GlassCard` per question, DnD types skip the "Your answer" line same as web).
      **Retake reuses the two existing session-start entry points rather than adding a third**
      (`quizSlice.ts` intentionally only ports the thunks the real screens call — see its own
      module comment — so no `startSessionByQuizId` thunk exists here, unlike web's fallback
      player): new `components/quiz/quizHistoryLinks.ts`'s `canRetake`/`navigateToRetake` route a
      roadmap Topic quiz (`quizMode:'fixed'` + a resolved `nodeId`) through the same
      `/quiz/[itemId]` route a normal tap would use, and a Dictionary/course-pool quiz
      (`quizMode:'dynamic'`/`'pool'`) through Quiz Mode Select
      (`/quiz/modes/dictionary/[miniAppId]`) — anything else (an orphaned fixed quiz whose node
      was later deleted, or a pre-`quizId` session) has no retake target and the button is
      disabled, same graceful-degradation rule web follows. **Backend addition**: the roadmap
      retake path needed to carry the teacher's `Quiz.assignedPlayMode` — omitting it would have
      made a retake of a Hearts/Timer-assigned Topic quiz silently start as an ordinary session
      instead of reproducing the same experience a normal tap gives — so `QuizHistoryEntry` and
      `SessionReviewResult.session` both gained `assignedPlayMode: IAssignedPlayMode | null`
      (`quizHistory.service.ts`'s existing `Quiz.find`/`Quiz.findById` calls already fetched the
      full document, so this was a zero-extra-query addition); `navigateToRetake` passes it
      through `encodeAssignedPlayMode` exactly like `RoadmapPath`/`QuizPickerModal` already do for
      an ordinary tap. Verified via `tsc --noEmit` and a clean `expo export --platform android`
      (3951 modules) — not yet confirmed on a real device/emulator, per this project's established
      "flag what's unverified" convention.
- [x] Functional Menubar profile switcher + DiceBear avatars (August 2026) — `Menubar`'s
      account/avatar button (previously just static initials, no `onPress`) now opens
      `src/components/ProfileSwitcherModal.tsx` (new), this app's port of apps/web's
      `components/nav/ProfileSwitcher.tsx` dropdown: current profile (non-tappable), other
      profiles to switch to (PIN-gated ones open a PIN pad first), "Add Profile", and "Sign
      out" — rendered as a top-right-anchored `Modal` (backdrop-tap to dismiss) rather than an
      absolutely-positioned dropdown, since RN has no hover/click-outside primitive to anchor
      one under the avatar the way web's does. New `src/components/Avatar.tsx` renders a
      DiceBear image (`src/lib/avatar.ts`'s `dicebearAvatarUrl()`, same per-`ageGroup` style
      choice as web's `avatarUrl()` — `fun-emoji` for `child`, `adventurer` otherwise) layered
      over an initials circle; unlike web's plain `<img>`, the initials underneath double as a
      built-in fallback while the image loads or if it fails, since a DiceBear `svg` URI can't
      feed a plain RN `<Image>` (no SVG-parsing without `react-native-svg`'s `SvgUri`) — this
      pulls DiceBear's `png` endpoint instead, the one deliberate format difference from web.
      `PinEntryModal` (new) was extracted out of `app/select-profile.tsx`'s previously-inline
      pin pad so `ProfileSwitcherModal` could reuse it without duplicating it, mirroring web's
      already-separate `components/auth/PinModal.tsx`; `select-profile.tsx` itself is otherwise
      unchanged. One deliberate improvement over web: after switching profiles, web's
      `ProfileSwitcher` navigates straight to `/dashboard` without ever re-fetching the new
      profile, so its own avatar/name go stale until something else refetches it — this follows
      `select-profile.tsx`'s fuller `selectProfile` → `fetchActiveProfile` → resume-last-route
      (or `/profile-setup` if unfinished) flow instead, the only way `Menubar`'s own avatar ends
      up showing the newly-active profile immediately. "Add Profile" mirrors web's dropdown
      exactly, **including its current no-op**: both navigate to `/select-profile`, which
      `ProtectedRoute`'s `requireFullToken:false` guard immediately bounces back home whenever
      an access token is already held (no "create a new profile" form exists yet on either
      platform — see "Profile management screens" below) — not fixed here, out of this pass's
      scope. `Menubar`'s `label`/`onBackPress` props are now optional (an empty `<View/>` takes
      the back button's place, so `justifyContent:'space-between'` still pushes the stat/avatar
      cluster fully right) so a screen with no natural "back" destination can render just that
      cluster — used to add `Menubar` to `home.tsx` (the enrolled-subjects list), the one
      screen in the Menubar rollout above that never got one. Verified via `tsc --noEmit` and a
      clean `expo export --platform android` (3955 modules) — not yet confirmed on a real
      device/emulator.
- [x] Guest mode (August 2026) — "Continue as guest" added to the existing `(auth)/login.tsx`
      as a visually secondary text link (not a new screen — `LaunchScreen.tsx` already owns the
      "first impression while loading" concern). `continueAsGuest` (new `authSlice.ts` thunk)
      posts to `/auth/guest` and sets `accessToken`/`isAuthenticated` directly, skipping
      `/select-profile` entirely; it doesn't set `activeProfile` itself (the response's
      `profile` is only `ProfileSummary`-shaped, missing fields the full `IProfile` needs), so
      the Login screen dispatches `fetchActiveProfile()` right after — the same two-step
      "select → fetch full profile" shape `select-profile.tsx`/`ProfileSwitcherModal.tsx`'s
      `doSelectAndNavigate` already use. Claiming (adding email/password to the same
      account, no logout) is a new `ClaimAccountModal` (mirrors `PinEntryModal.tsx`'s focused
      centered-`Modal` pattern) backed by a new `claimAccount` thunk, reachable from two
      places: a "Save your progress" row in `ProfileSwitcherModal.tsx` (shown only when
      `activeProfile.isGuest`), and a new one-time, dismissible `GuestProgressNudge` shown
      from `QuizSessionScreen.tsx` after a guest's first completed quiz session — "shown once"
      is tracked per-profile in `expo-secure-store` (`hasShownGuestNudge`/
      `markGuestNudgeShown` in `secureStore.ts`), consistent with
      [docs/business/monetisation.md](docs/business/monetisation.md)'s "no dark patterns"
      stance (tied to an achievement moment, never blocks navigation). Guest accounts are not
      capped below the normal 6-profile limit; "Add Profile" stays exactly as much of a dead
      end for a guest as it already was for a real account (not fixed here). Backend is fully
      shared/platform-agnostic — `apps/web` has no guest entry point yet, a deliberately
      separate later pass. See [docs/technical/guest-mode.md](docs/technical/guest-mode.md).
- [x] Brand fonts — Fredoka + Nunito Sans, app-wide (August 2026) — Chewy removed entirely,
      Fredoka takes over its old display-heading role; Nunito Sans is new, and is now the app's
      real default body font everywhere (previously nothing was — every `<Text>` fell back to
      the OS default). `packages/shared/constants/theme.ts`'s `fontFamilies` is the shared
      source of truth (see the Conventions entry below and apps/web's mirrored entry above);
      `src/theme/fonts.ts` maps `display`/`body` to the exact expo-font-loaded names (RN needs
      the weight baked into the family string, e.g. `Fredoka_700Bold` — there's no family+weight
      pairing for a statically-loaded font the way CSS has). `app/_layout.tsx`'s `useFonts()`
      swapped `Chewy_400Regular` for `NunitoSans_400Regular/500Medium/600SemiBold/700Bold`
      alongside the existing `Fredoka_400Regular/500Medium/600SemiBold/700Bold`;
      `@expo-google-fonts/chewy` removed from `package.json`.
      Unlike apps/web (Tailwind Preflight cascades `font-family` from `html` for free), RN's
      `<Text>` has zero font inheritance — and (confirmed by reading RN 0.86's `Text.js`
      directly, since this app is on a very new RN/React 19 combination) it no longer reads
      `Text.defaultProps` either, so the classic "monkey-patch `Text.defaultProps`" trick for a
      global default font doesn't work on this version. The fix: new
      `src/components/AppText.tsx`, a `forwardRef` wrapper around RN's real `Text` that applies
      `fonts.body.regular` as a default style (an explicit `fontFamily` in a passed `style`
      still wins — array-style flattening applies later entries over earlier ones for the same
      key). A one-off codemod script swapped every file importing `Text` from `'react-native'`
      to import it from this wrapper instead (47 files, `AppText.tsx` itself is the one
      exception) — mechanical import-line changes only, no JSX touched. Fredoka stays
      explicit/per-instance (no RN equivalent of web's free `h1`-`h6` rule): the four Quiz Modes
      files that already hardcoded `'Fredoka_400Regular'`-style string literals
      (`QuizModeSelectScreen.tsx`, `QuizModeCard.tsx`, `QuizSettingsModal.tsx`,
      `QuizPickerModal.tsx`) now reference `fonts.display.*` instead — same fonts, just
      centralized, no visual change — plus two real swaps: `QuizModeSelectScreen`'s page
      heading (previously the app's one Chewy usage) is now `fonts.display.bold`, and
      `Menubar`'s back-button label (previously plain system-font caps, with a comment
      explicitly noting Chewy wasn't loaded) is now genuinely Fredoka, since it's loaded
      app-wide today. Verified via `tsc --noEmit` (clean) and a clean `expo export --platform
      android` (3974 modules) — not yet confirmed on a real device/emulator, per this project's
      established "flag what's unverified" convention. See
      [docs/technical/mobile-architecture.md](docs/technical/mobile-architecture.md)'s "Fonts"
      section for full detail.
- [ ] OAuth on native (Google/Facebook via deep-link/AuthSession) — deferred, email/password only
- [ ] Forgot-password / reset-password / verify-email screens — backend flow exists and works, mobile screens just not built yet
- [ ] Profile management screens

---

## Conventions

- TypeScript strict mode everywhere — no `any` types
- All API routes follow REST conventions
- API modules organised by feature under `src/modules/`
- Shared types live in `packages/shared/types/` — imported by all apps
- Environment variables in `.env` files — never committed to git
- Consistent API response shape via `utils/response.ts`
- Errors thrown as `new AppError(message, statusCode)` 
- Async controllers wrapped with `catchAsync()`
- Rate limiting on auth routes: 2000 requests per 15 minutes (a blanket `express-rate-limit`
  guard, not per-user); Course Chat's AI Helper has its own separate per-profile rate limit (5s
  cooldown + 50 messages/day) derived from the `AiChatMessage` collection — see its API Routes
  Reference entry above
- Education levels follow the South African schooling system
- Always check ageGroup from JWT when serving content
- `audio:` prefix on `content.prompt` tells frontend to play audio,
  not display text
- `question.content` is Schema.Types.Mixed — cast to `IQuestionContent` immediately after retrieval
- DnD questions require `content.draggables` and `content.dropZones`; dnd_fill/dnd_build also need `content.sentenceTemplate`
- `resolveHelpers(content.defaultHelpers, nodeOverrides)` from packages/shared gives final IQuestionHelpers
- DnD rawResponse format: `JSON.stringify({ placements: [{ draggableId, dropZoneId }] })`
- Quiz items reference a Quiz directly via `RoadmapNode.items[].itemId` (itemType 'quiz') — no wrapper Lesson; `Quiz.questionIds[]` holds the ordered questions
- When seeding a node's quiz items: create the `Quiz` documents (mode:'fixed'), then the question-seed file is the sole writer of that node's `items[]` (full-array overwrite each run — see `isizulu/vowels.questions.ts` for the canonical pattern)
- Term.word is unique per miniAppId (compound index) — when upserting Terms, always include `miniAppId` in the query filter
- For roadmap-linked Term/Question/Quiz content, `miniAppId` holds the owning **Course's `_id`**, not a MiniApp's — there's no MiniApp document for roadmap content
- Roadmap.nodes[] and RoadmapNode.items[] are the canonical ordering arrays
- A Roadmap carries no subject/miniApp context of its own — it's referenced from `Course.roadmapId`; a Subject can have multiple Courses (and therefore multiple Roadmaps)
- Roadmap seeders are Course-first: upsert the `Course` by (subjectId, slug), then resolve the Roadmap via `course.roadmapId` if it exists or create a new one — see `seeders/roadmaps/*.roadmap.seed.ts`
- Subject enrollment (ProfileSubjectEnrollment) is the entry point for a learner starting a subject; `progressSummary` rolls up across every Course under that subject
- Mobile requests send `X-Client-Type: mobile`; `/auth/login` then includes `refreshToken` in the
  JSON body (alongside the existing httpOnly cookie) and `/auth/refresh` accepts `{ refreshToken }`
  in the body ahead of the cookie — web's cookie-only flow is unchanged when the header is absent
- `packages/shared/constants/theme.ts` is the canonical design-token source (colour/spacing/radius/
  typography/fontFamilies/fontWeights) for both apps/web and apps/mobile — keep it in sync with
  docs/design/brand-guide.md. `lightColors`/`darkColors` are the two colour objects (no plain
  `colors` export); apps/mobile resolves the active one through `src/theme/ThemeContext.tsx`'s
  `useTheme()` — never import `lightColors`/`darkColors` directly in a mobile component, always
  go through the hook
- Two brand fonts, app-wide on both apps: **Fredoka** (display/headings/short prominent labels)
  and **Nunito Sans** (body copy — the default everywhere else), replacing the old Chewy (August
  2026). `fontFamilies` in `theme.ts` is the single source of truth. apps/web wires
  `fontFamilies.body` in as Tailwind's `sans` default (`tailwind.config.ts`) so it cascades
  app-wide for free via Preflight, and `fontFamilies.display` to every `h1`-`h6` in
  `src/index.css` — no per-component changes needed there. apps/mobile has no such CSS
  cascade: `src/theme/fonts.ts` maps the two families to the exact expo-font-loaded names
  (`Fredoka_700Bold`, `NunitoSans_400Regular`, etc.), and every mobile `Text` must come from
  `src/components/AppText.tsx` (a thin wrapper defaulting to `fonts.body.regular`) instead of
  `'react-native'` directly — that's the "one place" the Nunito Sans default lives, since RN
  `<Text>` has no font inheritance and no working `Text.defaultProps` on this RN version. Use
  `fonts.display.*` explicitly for Fredoka headings/labels on mobile.
- In `apps/mobile`, any `StyleSheet.create` that references theme `colors` must be built by a
  `createStyles(colors)` function called inside the component body (colors come from
  `useTheme()`, a hook, so the styles can't be computed at module scope anymore) — see any
  component under `src/components/` for the pattern
- In `apps/mobile`, never name a `src/` subfolder `app` — Expo Router silently prefers `src/app/`
  over the project's real `app/` directory as its routes root whenever a `src/` folder exists

---

## Notes for Claude Code

- Read this file at the start of every session before doing anything
- Update CLAUDE.md and relevant docs/ files at the end of every Claude Code session, in the same PR, as a standing rule — not optional, not deferred.
- We are not scaling yet — keep solutions simple and straightforward
- Always use TypeScript, never plain JavaScript
- When creating new API modules follow the same structure as existing ones
- When adding new models follow the placement rule above
- Free hosting only for now
- Education levels follow South African schooling system (grade-r to grade-12)
- Never store plain text passwords or PINs — always bcrypt
- Max 6 profiles per account — enforce at service level
- Questions are generic by default (isGeneric: true) — 
  user-specific questions are a future feature
- Distractor definitions must exclude ALL definitions from the same term
- AI prompts for question generation must be anchored to the 
  specific definition being tested
- Sound/phonics "terms" (vowels, syllables, CVC words) are Term documents —
  they use the same adaptive learning system as vocab terms
- XP and peanuts reward system exists in the data model 
  but the service layer is not yet built
- Test readiness scoring is designed but not yet built
- Quiz items on `RoadmapNode.items[]` reference a `Quiz` (mode:'fixed') directly by itemId —
  never wrap a quiz in a Lesson document; Lessons are pure study material (resources[]) only
- When seeding Term documents, always include `miniAppId` in the upsert 
  query filter — Term.word is unique per miniAppId, not globally
- isiZulu has no /r/ phoneme as a native consonant — never generate 
  ra/re/ri/ro/ru syllables in consonant drills
- One-off, non-idempotent-seeder scripts for schema-restructure changes against real data go
  in `apps/api/src/seed/migrations/` (one file per migration, named `YYYY-MM-description.ts`),
  with a dedicated `pnpm --filter api migrate:<name>` script — never wire these into the
  regular `pnpm seed` run
- `Topic` was removed as a model (July 2026) — don't reintroduce it; grouping MiniApps under a
  Subject is `MiniApp.subjectId`, and the "step in a roadmap" meaning belongs to `RoadmapNode`
```

---

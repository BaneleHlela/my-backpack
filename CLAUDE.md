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

One **Account** handles authentication (email, password, OAuth).
An Account can have up to **6 Profiles**. Each Profile is what actually 
uses the app — has its own progress, settings, age-appropriate content, 
and learning data. Think Netflix-style profile switching.

- Account owner logs in → sees profile selector → selects profile → 
  gets full access token
- Child profiles can be PIN-protected
- Only the owner profile can create, edit, or delete other profiles
- Maximum 6 profiles per account — enforced at service level

### Auth Flow
1. Register/Login → partial JWT (accountId only) + refresh token in 
   HTTP-only cookie
2. Select profile → full JWT (accountId + profileId + ageGroup)
3. All protected routes require full JWT
4. Access token: 15 minutes | Refresh token: 7 days

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
│   └── profileSubjectEnrollment.model.ts
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
authProviders[], profiles[], activeProfile, isEmailVerified.

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
Defaults to `false` (authored order). Set per-question via `content.defaultHelpers` — no
teacher-facing toggle UI exists yet (schema + logic only).

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
Groups answer records. Fields: profileId, miniAppId, status 
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

### Lesson
A pure study-material container — one 'lesson'-type item inside a
RoadmapNode.items[]. Fields: nodeId, roadmapId (denormalized),
position (1-based within node), title, resources[] (ordered — see
IResource below), isActive.

Quizzes are NOT wrapped in a Lesson — a 'quiz'-type item on
RoadmapNode.items[] references a Quiz document directly (itemId =
Quiz._id). A Lesson never has quizId/passingScore/lessonType; those
concepts moved to the node's item ref (see RoadmapNode below).

IResource (one entry per resources[] element): { type: 'video' | 'pdf' |
'image' | 'notes' | 'audio' | 'steps', position, url? (video/pdf/image/audio),
caption? (video/image/audio), title? (pdf), markdown? (notes),
steps? [{ title?, content }] (steps — a read-only stepped/sliding-notes
viewer, not a quiz) }.

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
[{ curriculum, gradeLevel }], items [{ itemType: 'lesson' | 'quiz', itemId,
position, passingScore? }], unlockRequires[], linkedCourseIds[] (reserved for the deferred
multi-provider-course feature — always empty today), rewards { xp, peanuts, badge? },
isActive.

`items[]` is heterogeneous and is the canonical ordering array — replaces
the old `lessons[]`. `itemType: 'lesson'` → itemId points to a Lesson
document (pure study material). `itemType: 'quiz'` → itemId points to a
Quiz document directly (no wrapper Lesson); `passingScore` (0–1) lives on
the item ref itself, not on the Quiz (a Quiz can be reused outside
roadmaps). `itemType` is a plain string union, extensible later to
'resource' | 'notes' | 'chatbot' etc — not built yet. `itemId` has no
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
item in `items[]` (by position) is passed.

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
POST  /api/quiz/session
GET   /api/quiz/session/:sessionId
POST  /api/quiz/session/:sessionId/answer
PATCH /api/quiz/session/:sessionId/complete
PATCH /api/quiz/session/:sessionId/abandon
GET   /api/quiz/session/:sessionId/results
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
POST   /api/dashboard/nodes/:nodeId/lessons                  — { title, resources: IResource[] }
POST   /api/dashboard/nodes/:nodeId/quizzes                  — { title, settings? }; always mode:'fixed', miniAppId: <course._id>

PATCH  /api/dashboard/lessons/:lessonId                       — title/resources only
DELETE /api/dashboard/lessons/:lessonId                       — soft delete; removes its entry from the parent node's items[], renumbers the rest

GET    /api/dashboard/quizzes/:quizId                          — direct Quiz.findById, no course/miniAppId dependency
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
│   └── landscape/
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
│   │       │   └── quizSession.service.ts
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
│       │       └── miniapp/[miniAppId]/  # Dictionary: index, term/[termId], bucket
│       ├── src/
│       │   ├── store/store.ts   # Redux store — NEVER rename this dir to src/app/,
│       │   │                    # Expo Router silently prefers src/app/ as its routes
│       │   │                    # root over the real app/ dir if that name is used
│       │   ├── lib/             # api.ts (axios + X-Client-Type: mobile), secureStore.ts, audio.ts
│       │   ├── features/        # auth, content, vocab slices
│       │   └── components/      # GlassCard, PrimaryButton, ScreenBackground, TextField,
│       │                        # ProtectedRoute, dictionary/ (mini-app-specific)
│       └── metro.config.js      # watchFolders + nodeModulesPaths only — do not add
│                                # resolver.unstable_enableSymlinks / disableHierarchicalLookup,
│                                # both break pnpm's nested transitive-dep resolution on this SDK
├── packages/
│   ├── shared/
│   │   ├── constants/
│   │   │   ├── assets.ts
│   │   │   └── theme.ts        # colour/spacing/radius/typography — canonical design-token
│   │   │                        # source for both apps/web and apps/mobile; keep in sync
│   │   │                        # with docs/design/brand-guide.md
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
│           └── enrollment.ts   # IProfileSubjectEnrollment, IProgressSummary
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
- [x] INodeQuestionAssignment on RoadmapNode.assessment.questionAssignments
- [x] Question generation system (auto + AI via Anthropic Haiku)
- [x] Adaptive learning service (confidence scores, velocity, spaced repetition)
- [x] Quiz session service (create, answer capture, complete, abandon)
- [x] Shuffle support — `IQuestionHelpers.shuffleDraggables` (per-question, DnD pool order) and
      `Quiz.settings.shuffleQuestions`/`ISessionSettings.shuffleQuestions` (per-quiz, question
      order at session-start); schema + logic only, no teacher-facing toggle UI yet
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
      reads `/api/dashboard/assets?type=&search=`, always stores a GCS **path**, never a full URL.
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
      with `fetchCoursesBySubject`/`fetchCourseDetail`)
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
- Rate limiting on auth routes: 20 requests per 15 minutes
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
  typography) for both apps/web and apps/mobile — keep it in sync with docs/design/brand-guide.md
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

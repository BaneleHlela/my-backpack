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
  deprecated), `expo-blur` (glassmorphism cards)
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
| Expo Go | Mobile testing |

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
    Topic       (e.g. Vocabulary, Sounds, Grammar, Differentiation)
      MiniApp   (e.g. Dictionary, Quiz, Roadmap, Flashcards)
```

### Rule of thumb for placing models
- Exists before any learning starts → `models/core/`
- Tracks learning but subject-agnostic → `models/learning/`
- Specific to one mini-app's content → `models/apps/field/subject/topic/`

### MiniApp types
`'quiz' | 'roadmap' | 'dictionary' | 'flashcards' | 'practice'`
Used by frontend to know which UI to render.

### Seeded hierarchy
```
Language (field)
  ├── English (subject)
  │     ├── Vocabulary (topic)
  │     │     ├── Dictionary (miniApp, type: dictionary)
  │     │     └── Quiz (miniApp, type: quiz)
  │     └── Phonics (topic)
  │           └── Phonics Roadmap (miniApp, type: roadmap)
  │                 ├── Node 1: Vowel Sounds — 7 items: 1 lesson (video intro) + 6 quiz
  │                 │     items escalating distractor count (1→2→5) and audio-on-tap
  │                 │     (60 dnd_single questions + 5 mcq_audio kept for reuse)
  │                 └── Node 2: Three-Letter Words — 3 items: 1 lesson + 2 quiz items (22 questions: mcq_audio + dnd_build × 11 CVC words)
  └── IsiZulu Home Language (subject)
        └── Sounds (topic)
              └── Sounds Roadmap (miniApp, type: roadmap)
                    ├── Node 1: Izinhlamvu Zokuvuma — Vowels — 7 items: 1 lesson (video
                    │     intro) + 6 quiz items escalating distractor count (1→2→5) and
                    │     audio-on-tap (60 dnd_single questions + 5 mcq_audio kept for reuse)
                    └── Node 2: Izinhlamvu Zongwaqa — Consonants — 3 items: 1 lesson + 2 quiz items (20 questions: mcq_audio + dnd_build × 10 syllables)

Foundation Phase Mathematics (field)  [note: actual field slug — verify via DB if querying]
  └── Foundation Phase Mathematics (subject)
        └── Number Sense (topic)
              └── Number Sense Roadmap (miniApp, type: roadmap)
                    ├── Node 1: Let's Learn to Drag! — 3 items: 1 lesson + 2 quiz items (8 practice + 5 assessment dnd_single questions)
                    └── Node 2: Counting 1 to 10 — 3 items: 1 lesson + 2 quiz items (10 dnd_count questions)
```

---

## Model Structure

```
apps/api/src/models/
├── core/
│   ├── account.model.ts
│   ├── profile.model.ts
│   ├── field.model.ts
│   ├── subject.model.ts
│   ├── topic.model.ts
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
dateOfBirth, isOwner, pin (bcrypt, cost 10), education, preferences, 
progress, isSetupComplete.

Education levels (SA system):
`grade-r | grade-1 ... grade-12 | certificate | diploma | bachelors | 
honours | masters | phd | professional | other`

### Term
Shared across all users. Fields: word, miniAppId, phonetic, origin, 
audioUrl, source ('dictionary_api' | 'manual'), aiGenerationStatus 
('pending' | 'complete' | 'failed' | 'not_needed'), aiGenerationAttempts, 
aiGenerationError, aiGeneratedAt.

Note: Sound/phonics "terms" (vowels, consonant syllables, CVC words) are 
Term documents within their respective MiniApps — they plug into the 
existing adaptive learning system. Term.word is unique **per miniAppId** 
(compound index), not globally — the same letter 'a' can exist as a Term 
for isiZulu Sounds and for English Phonics independently.

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
Belongs to a subject, a miniApp, or both. At least one of subjectId or 
miniAppId must be present (enforced by pre-validate hook).
Fields: subjectId (optional), miniAppId (optional), title, description,
nodes [{ nodeId, position }] — canonical ordered list of nodes, isActive.

`nodes[]` is the source of truth for node ordering. Sparse indexes on 
both subjectId and miniAppId.

### RoadmapNode
Fields: roadmapId, title, description, position, type 
('lesson' | 'checkpoint' | 'practice'), curriculumTags 
[{ curriculum, gradeLevel }], items [{ itemType: 'lesson' | 'quiz', itemId,
position, passingScore? }], unlockRequires[], rewards { xp, peanuts, badge? },
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
Fields: profileId, roadmapId, miniAppId (optional), nodeProgress 
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
GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/topics
GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/topics/:topicSlug/miniapps
GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/topics/:topicSlug/miniapps/:miniAppSlug
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
GET  /api/roadmap/:miniAppId
GET  /api/roadmap/subject/:subjectId
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
└── content/
    ├── vocab/
    ├── math/
    │   └── objects/        ← apple.png, cabbage.png, car.png, etc.
    └── english/
        ├── vowels/         ← card-a.png, card-e.png, etc. (superseded by draggables/alphabet/ for dnd_single)
        └── cvc/            ← letter tile images
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
- `seeders/roadmaps/` — one file per subject's roadmap
- `questions/` — one file per subject, contains the actual question
  content. This is where you add or edit individual questions
  (e.g. vowels, basic vocab terms).

To add a new isiZulu vowel: edit `questions/isizulu/vowels.questions.ts`
To add a new isiZulu consonant: edit `questions/isizulu/consonants.questions.ts` (consonantData array)
To add a new English vowel: edit `questions/english/vowels.questions.ts`
To add a new CVC word: edit `questions/english/cvc-words.questions.ts` (wordData array)
To add a new English term: edit `questions/english/vocab-basics.questions.ts`
To add a new math counting question: edit `questions/math/counting.questions.ts`
To add a new drag-intro object: edit `questions/math/drag-intro.questions.ts`
To add a new subject's roadmap: create a new file in `seeders/roadmaps/`

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
│   │       │   ├── data/               # raw constant data, no DB calls
│   │       │   ├── seeders/            # accounts, content hierarchy, roadmaps
│   │       │   │   └── roadmaps/
│   │       │   └── questions/          # per-subject question content
│   │       │       ├── english/        # vocab-basics, vowels, cvc-words
│   │       │       ├── isizulu/        # vowels, consonants
│   │       │       └── math/           # drag-intro, counting
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
│   │       │   └── theme/      # themeSlice
│   │       ├── lib/            # axios instance
│   │       └── pages/
│   │           ├── LoginPage
│   │           ├── SignupPage
│   │           ├── ForgotPasswordPage
│   │           ├── ResetPasswordPage
│   │           ├── VerifyEmailPage
│   │           ├── SelectProfilePage
│   │           ├── ProfileSetupPage
│   │           └── DashboardPage (skeleton)
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
│           ├── content.ts      # IField, ISubject, ITopic, IMiniApp
│           ├── term.ts         # ITerm, IDefinition
│           ├── question.ts     # IQuestion, IQuestionContent, IDraggable,
│           │                   # IDropZone, IBlank, IFeedback, IAvatarConfig,
│           │                   # IQuestionHelpers, defaultHelpers,
│           │                   # INodeQuestionAssignment, QuestionType
│           ├── quiz.ts         # IQuizSession, IAnswerRecord
│           ├── learning.ts     # ILearningRecord, IAdaptiveProfile
│           ├── roadmap.ts      # IRoadmap, IRoadmapNode, INodeItemRef, ILesson,
│           │                   # IResource, IProgress
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
- [x] Content hierarchy (Field → Subject → Topic → MiniApp)
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
- [x] English Phonics content hierarchy (Topic + MiniApp + Roadmap seeded)
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
- [ ] XP and peanuts reward system (deferred)
- [ ] Test readiness scoring (deferred)
- [ ] Book/PDF upload pipeline (deferred)
- [ ] AI-powered content generation from books (deferred)
- [ ] Mobile auth UI (deferred)

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
- [x] Age-group-aware DnD/quiz-chrome styling — `DndSinglePattern`, `QuizProgress`, `AnswerFeedback` take an `ageGroup` prop and render a distinct child-mode glassmorphism treatment (large glass prompt bubble + stacked replay/hint buttons, clamp-sized draggable tiles, flex-1 drop zone) alongside the unchanged adult/teen default; see [docs/design/child-dnd-quiz-style.md](docs/design/child-dnd-quiz-style.md)
- [x] No-scroll viewport contract for the active-question view — shared `QuizPageShell` (`apps/web/src/components/quiz/QuizPageShell.tsx`) locks `QuizPage`/`QuizItemPlayerPage` to `h-[calc(100dvh-60px)]` (accounts for AppLayout's 60px TopNav) with `overflow-hidden`; the active question region is `flex-1 min-h-0 overflow-hidden` so a 5-draggable `dnd_single` question never forces scrolling, while start/results/error/loading states keep their natural scrollable-if-needed treatment
- [x] Live TTS with word highlighting (interim) — `SpokenText` component (browser Web Speech API via `react-text-to-speech`) reads question prompts, avatar dialogue, and answer feedback aloud with manual playback; always defers to prerecorded audio where it exists; see [docs/content/live-tts-word-highlighting.md](docs/content/live-tts-word-highlighting.md)
- [ ] Profile management screens

### Frontend Mobile (apps/mobile)
- [x] Expo scaffold (SDK 57, RN 0.86, React 19.2 at time of writing), Expo Router, monorepo/Metro wiring
- [x] Backend mobile-auth support — refresh token returned in-body for `X-Client-Type: mobile`, stored in `expo-secure-store`
- [x] Theme tokens (`packages/shared/constants/theme.ts`) + base UI primitives (GlassCard, PrimaryButton, ScreenBackground, TextField)
- [x] Auth screens (login, signup, select-profile with PIN keypad, profile-setup) + guarded route tree (ProtectedRoute ported from web)
- [x] Minimal Home screen — enrolled-subjects list + enroll modal, no roadmap visualisation
- [x] Dictionary mini-app (search, trending, A-Z browse with pagination, recent searches, term detail, add-to-bucket, bucket management)
- [ ] Roadmap UI (node path, lesson player, progress bars) — deferred
- [ ] Quiz UI / `dnd_*` question types — deferred
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
- Roadmap.nodes[] and RoadmapNode.items[] are the canonical ordering arrays
- A Roadmap must have at least one of subjectId or miniAppId (enforced by pre-validate hook)
- Subject enrollment (ProfileSubjectEnrollment) is the entry point for a learner starting a subject
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
```

---

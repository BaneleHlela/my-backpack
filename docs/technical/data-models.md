# Data Models Reference

This document describes every Mongoose model in the My Backpack API. Models are grouped by their location in the `apps/api/src/models/` directory, which reflects their purpose in the system.

**Rule of thumb:**
- Lives before learning starts → `models/core/`
- Tracks learning but subject-agnostic → `models/learning/`
- Specific to one mini-app's content → `models/apps/<field>/<subject>/<topic>/`

---

## Core Models

These models represent the permanent structure of the platform: who the users are and what content exists.

---

### Account

**Purpose:** Handles authentication only. Does not represent a learning identity.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `email` | String | Unique email address for login |
| `password` | String | Bcrypt hash (cost 12). Not set for OAuth-only accounts |
| `authProviders` | Array | OAuth providers used (`google`, `facebook`) |
| `profiles` | ObjectId[] | References to Profile documents owned by this account |
| `activeProfile` | ObjectId | The last-selected profile |
| `isEmailVerified` | Boolean | Email verification status |

**Relationships:** One Account → many Profiles (max 6, enforced at service level).

**Business rules:**
- Maximum 6 profiles per account
- Passwords are always stored as bcrypt hashes, never plain text
- OAuth accounts may have no password field

---

### Profile

**Purpose:** The entity that actually uses the app — has its own progress, settings, age-appropriate content, and learning data.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `accountId` | ObjectId | The Account this profile belongs to |
| `displayName` | String | Name shown in the profile selector |
| `avatarUrl` | String | URL to profile avatar image |
| `ageGroup` | Enum | `child` \| `teen` \| `adult` |
| `dateOfBirth` | Date | Used to determine age group automatically |
| `isOwner` | Boolean | Owner profiles can create, edit, and delete other profiles |
| `pin` | String | Optional bcrypt hash (cost 10) — used to lock child profiles |
| `education` | Enum | SA education level (grade-r through phd) |
| `preferences` | Object | UI preferences (theme, language) |
| `progress` | Object | Summary stats (total XP, peanuts, streak) |
| `isSetupComplete` | Boolean | Whether the profile setup wizard has been completed |

**Relationships:** Many Profiles → one Account. One Profile → many LearningRecords, QuizSessions, BucketEntries.

**Business rules:**
- Only the owner profile (`isOwner: true`) can create, edit, or delete other profiles
- PINs are optional but required for child profiles when the owner wants to lock them
- `ageGroup` controls which question types and how many definitions are shown
- Education levels follow the South African schooling system

---

### Field

**Purpose:** The top level of the content hierarchy. Represents a broad area of knowledge.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `name` | String | Display name (e.g. "Language", "Mathematics") |
| `slug` | String | URL-safe identifier (e.g. "language") |
| `description` | String | Brief description |
| `iconUrl` | String | Icon image URL |

**Example:** Language, Mathematics, Engineering

---

### Subject

**Purpose:** A specific subject within a Field.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `fieldId` | ObjectId | Parent Field |
| `name` | String | Display name (e.g. "English", "IsiZulu Home Language") |
| `slug` | String | URL-safe identifier |
| `description` | String | Brief description |
| `language` | String | Primary language code |

**Example:** English, IsiZulu Home Language, Calculus

---

### Topic

**Purpose:** A topic within a Subject. Groups related mini-apps.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `subjectId` | ObjectId | Parent Subject |
| `name` | String | Display name (e.g. "Vocabulary", "Sounds") |
| `slug` | String | URL-safe identifier |
| `description` | String | Brief description |

**Example:** Vocabulary, Sounds, Grammar, Number Sense

---

### MiniApp

**Purpose:** A specific interactive application within a Topic. The leaf node of the content hierarchy.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `topicId` | ObjectId | Parent Topic |
| `name` | String | Display name (e.g. "Dictionary", "IsiZulu Sounds Roadmap") |
| `slug` | String | URL-safe identifier |
| `type` | Enum | `quiz` \| `roadmap` \| `dictionary` \| `flashcards` \| `practice` |
| `description` | String | Brief description |
| `isActive` | Boolean | Whether this mini-app is live |

**Business rules:** The `type` field tells the frontend which UI component to render. A `roadmap` mini-app renders the visual level-map UI. A `quiz` mini-app renders the session-based quiz UI.

**Seeded content:**
- Language → English → Vocabulary → Dictionary (type: dictionary)
- Language → English → Vocabulary → Quiz (type: quiz)
- Language → IsiZulu Home Language → Sounds → Sounds Roadmap (type: roadmap)

---

## Learning Models

These models track what learners have done. They are subject-agnostic — the same models work whether you're learning vocabulary or mathematics.

---

### LearningRecord

**Purpose:** Tracks a single profile's mastery of a single term (or term+definition combination). This is the central record that the adaptive learning engine reads and writes.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `profileId` | ObjectId | The learner |
| `termId` | ObjectId | The term being tracked |
| `definitionId` | ObjectId | Optional — tracks a specific definition |
| `miniAppId` | ObjectId | Which mini-app this record belongs to |
| `confidenceScore` | Number | 0.0–1.0. The algorithm's estimate of how well the learner knows this term |
| `status` | Enum | `unseen` \| `learning` \| `mastered` \| `reviewing` |
| `totalAnswers` | Number | Total answer attempts |
| `correctAnswers` | Number | Number of correct answers |
| `lastAnsweredAt` | Date | When the learner last answered a question for this term |
| `nextReviewAt` | Date | When this term is due for spaced repetition review |
| `masteredAt` | Date | When the mastery threshold was first reached |
| `questionsToFirstMastery` | Number | How many questions it took to reach mastery |
| `reviewCount` | Number | How many times this term has entered the review cycle |

**Relationships:** One per profile per term per definition.

**Business rules:**
- `confidenceScore` rises on correct answers and falls on wrong ones (see Adaptive Algorithm)
- When `confidenceScore >= masteryThreshold` (default 0.85), status becomes `mastered` and `nextReviewAt` is set
- `reviewCount` determines the length of the spaced repetition interval

---

### AdaptiveProfile

**Purpose:** One per profile. Stores aggregate learning statistics used to calculate the learner's personal learning velocity.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `profileId` | ObjectId | One per profile |
| `miniAppStats` | Map | Per-mini-app stats: `avgQuestionsToMaster`, `totalTermsMastered`, `totalTermsAttempted`, `learningVelocity` |
| `globalStats` | Object | Aggregate across all mini-apps: accuracy, streaks, total answers |
| `masteryThreshold` | Number | Default 0.85. The confidence score required to mark a term as mastered |

**Business rules:** Learning velocity is recalculated every 10 mastered terms. It compares the learner's average questions-to-master against the platform average (5).

---

### QuizSession

**Purpose:** Groups a set of answers into a single learning session. Created when a learner starts a quiz; completed or abandoned when they finish.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `profileId` | ObjectId | The learner |
| `miniAppId` | ObjectId | Which mini-app this session belongs to |
| `status` | Enum | `active` \| `completed` \| `abandoned` |
| `questionIds` | ObjectId[] | The questions included in this session |
| `settings` | Object | `questionCount`, `timeLimit`, `questionTypes`, `bucketFilter` |
| `results` | Object | `totalQuestions`, `answered`, `skipped`, `correct`, `totalPointsAvailable`, `totalPointsAwarded`, `percentageScore`, `timeTakenMs` |
| `startedAt` | Date | Session start time |
| `completedAt` | Date | Session completion time |

---

### AnswerRecord

**Purpose:** Captures every single answer a learner gives. The raw audit trail — used for analytics, AI grading review, and debugging.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `profileId` | ObjectId | The learner |
| `questionId` | ObjectId | The question answered |
| `termId` | ObjectId | The term being tested |
| `miniAppId` | ObjectId | Which mini-app |
| `sessionId` | ObjectId | The QuizSession this answer belongs to |
| `responseType` | String | How the answer was submitted |
| `rawResponse` | String | The raw answer string (for DnD: JSON-serialised placements) |
| `selectedOptionIndex` | Number | For MCQ — which option was selected |
| `maxPoints` | Number | Maximum points available for this question |
| `pointsAwarded` | Number | Points actually earned |
| `isCorrect` | Boolean | Whether the answer was correct |
| `gradingMethod` | Enum | `exact_match` \| `keyword_match` \| `ai_graded` \| `pending` |
| `answeredAt` | Date | When the answer was submitted |
| `timeToAnswerMs` | Number | Milliseconds taken to answer |
| `wasTimedOut` | Boolean | Whether the question timed out |
| `attemptNumber` | Number | Which attempt this was (for multi-attempt questions) |
| `wasSkipped` | Boolean | Whether the question was skipped |
| `confidenceBefore` | Number | LearningRecord confidence score before this answer |
| `confidenceAfter` | Number | LearningRecord confidence score after this answer |

---

### Roadmap

**Purpose:** One per MiniApp of type `roadmap`. The container for the lesson path.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `miniAppId` | ObjectId | The MiniApp this roadmap belongs to |
| `title` | String | Display title |
| `description` | String | Brief description |
| `isActive` | Boolean | Whether this roadmap is live |

---

### RoadmapNode

**Purpose:** A single lesson, checkpoint, or practice activity within a Roadmap.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `roadmapId` | ObjectId | The parent Roadmap |
| `title` | String | Node title |
| `description` | String | Brief description |
| `position` | Number | Display order in the roadmap |
| `type` | Enum | `lesson` \| `checkpoint` \| `practice` |
| `curriculumTags` | Array | `[{ curriculum: 'CAPS'\|'IEB'\|'Cambridge', gradeLevel: string }]` |
| `studyMaterial` | Object | `{ notes, audioUrl, videoUrl, bookReference }` |
| `assessment` | Object | See below |
| `unlockRequires` | ObjectId[] | Node IDs that must be completed before this unlocks |
| `rewards` | Object | `{ xp, peanuts, badge? }` |
| `isActive` | Boolean | Whether this node is live |

**Assessment sub-document:**

| Field | Type | Description |
|---|---|---|
| `passingScore` | Number | Minimum score (percentage) required to complete |
| `attemptsAllowed` | Number | Maximum attempts before the node locks |
| `timeLimitSeconds` | Number | Optional time limit per question |
| `questionAssignments` | Array | `[{ questionId, order, helperOverrides? }]` |

The `questionAssignments` array links Question documents to this node with a display order and optional per-node helper overrides (`INodeQuestionAssignment`).

---

### ProfileRoadmapProgress

**Purpose:** Tracks one profile's progress through one roadmap. One document per profile per roadmap.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `profileId` | ObjectId | The learner |
| `roadmapId` | ObjectId | The roadmap being tracked |
| `miniAppId` | ObjectId | Denormalised for fast queries |
| `nodeProgress` | Map | `nodeId → { status, stars, attempts, bestScore, lastAttemptAt, completedAt, studyMaterialViewedAt }` |
| `currentNodeId` | ObjectId | The node currently in progress |
| `totalStars` | Number | Accumulated stars across all completed nodes |
| `startedAt` | Date | When the learner first entered this roadmap |
| `lastActivityAt` | Date | Most recent interaction |

**Node status values:** `locked` \| `unlocked` \| `in_progress` \| `completed`

**Stars:** 0–3 per node, awarded based on performance.

**Unique index:** `profileId + roadmapId` — one document per learner per roadmap.

---

## Vocabulary App Models

These models are specific to the vocabulary mini-app and live in `models/apps/language/vocabulary/`.

---

### Term

**Purpose:** A word or concept that learners can study. Shared across all users — there is one Term document per word, not one per user.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `word` | String | The term itself |
| `miniAppId` | ObjectId | Which mini-app this term belongs to |
| `phonetic` | String | Phonetic transcription |
| `origin` | String | Word origin / etymology |
| `audioUrl` | String | GCS URL for the pronunciation audio file |
| `source` | Enum | `dictionary_api` \| `manual` |
| `aiGenerationStatus` | Enum | `pending` \| `complete` \| `failed` \| `not_needed` |
| `aiGenerationAttempts` | Number | Number of AI generation attempts made |
| `aiGenerationError` | String | Error message if generation failed |
| `aiGeneratedAt` | Date | When AI generation completed |

**Business rules:**
- Maximum 3 AI generation retry attempts before status becomes permanently `failed`
- Failed terms can be retried via the admin endpoint
- Sound "terms" (vowels, syllables) are also Term documents — they plug into the same adaptive learning system
- `aiGenerationStatus: 'not_needed'` is set when a term has no definitions that require AI questions

---

### Definition

**Purpose:** One term can have multiple definitions (different parts of speech, different meanings). Each definition is its own document.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `termId` | ObjectId | The parent Term |
| `partOfSpeech` | String | e.g. "noun", "verb", "adjective" |
| `definition` | String | The definition text |
| `examples` | String[] | Example sentences using the term |
| `synonyms` | String[] | Synonyms |
| `antonyms` | String[] | Antonyms |
| `order` | Number | Display order when multiple definitions exist |

**Business rules:**
- MCQ distractors must exclude ALL definitions from the same term, not just the current one. This prevents multi-meaning words (like "bank") from having multiple correct options.
- AI question generation prompts are anchored to the specific definition being tested.

---

### TermBucket (referred to as "bucket" in the vocab module)

**Purpose:** A learner's personal collection of terms they are actively studying. One bucket per profile per mini-app.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `profileId` | ObjectId | The owner |
| `miniAppId` | ObjectId | Which mini-app |

---

### BucketEntry

**Purpose:** Tracks one term+definition combination within a learner's bucket. Fine-grained — if a term has 3 definitions, a learner can add all 3 independently.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `bucketId` | ObjectId | The parent TermBucket |
| `termId` | ObjectId | The term |
| `definitionId` | ObjectId | The specific definition being studied |
| `profileId` | ObjectId | Denormalised for fast queries |
| `partOfSpeech` | String | Denormalised from Definition for display |
| `status` | Enum | `learning` \| `mastered` \| `paused` |
| `addedAt` | Date | When the entry was added |

**Unique index:** `bucketId + termId + definitionId` — a learner cannot add the same definition twice.

---

### Question

**Purpose:** A question that can be presented to a learner during a quiz or roadmap node. Questions are shared across users — one Question document is reused by any learner who encounters the same term.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `termId` | ObjectId | Optional — the term this question tests |
| `definitionId` | ObjectId | Optional — the specific definition being tested |
| `miniAppId` | ObjectId | Which mini-app this question belongs to |
| `nodeId` | ObjectId | Optional — links to a RoadmapNode for roadmap-specific questions |
| `type` | String | One of 21 question type identifiers |
| `content` | Mixed | Unified content field — all question data lives here |
| `maxPoints` | Number | Maximum points available |
| `pointsCanBePartial` | Boolean | Whether partial credit is possible |
| `source` | Enum | `auto` \| `ai` \| `manual` |
| `isGeneric` | Boolean | `true` = reusable across all users; `false` = user-specific (future) |
| `profileId` | ObjectId | Null for generic questions |
| `isActive` | Boolean | Whether this question is in use |

**The `content` field (Schema.Types.Mixed):**

All question data lives inside `content`. Always cast to `IQuestionContent` immediately after retrieval. Key sub-fields:

| Sub-field | Purpose |
|---|---|
| `prompt` | The question text. If prefixed with `audio:`, the frontend plays audio instead |
| `options` | MCQ answer options |
| `correctAnswer` | The correct answer (string or index) |
| `explanation` | Shown after the learner answers |
| `draggables` | DnD questions — items the learner drags |
| `dropZones` | DnD questions — zones items are dropped into |
| `sentenceTemplate` | `dnd_fill` and `dnd_build` — the sentence with blanks |
| `feedback` | Per-outcome feedback messages |
| `avatar` | Avatar configuration for this question |
| `defaultHelpers` | `Partial<IQuestionHelpers>` — hints, audio, skip button configuration |

**Business rules:**
- `isGeneric: true` questions are generated once and reused by all learners who encounter the same definition
- The `audio:` prefix on `content.prompt` tells the frontend to play the remainder as a GCS path
- See `question.types.ts` for the full `IQuestionContent` interface definition

---

*Last updated: June 2026*

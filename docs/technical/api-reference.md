# API Reference

All endpoints are prefixed with `/api`. All responses follow the shape defined in `apps/api/src/utils/response.ts`. Errors are thrown as `AppError` instances and handled by the global error handler.

**Auth levels:**
- **None** — no token required
- **requireAccount** — valid JWT required (partial or full token)
- **requireProfile** — full JWT required (must have selected a profile)
- **requireOwner** — full JWT where `profile.isOwner === true`

---

## Auth

### `POST /api/auth/register`

**Auth:** None

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "displayName": "Banele"
}
```

**Response:** Creates Account and an initial owner Profile. Returns a partial JWT and sets refresh token in HTTP-only cookie.

```json
{
  "token": "<partial_jwt>",
  "profile": { "id": "...", "displayName": "Banele", "isOwner": true }
}
```

---

### `POST /api/auth/login`

**Auth:** None

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** Returns a partial JWT (accountId only) and sets refresh token cookie. Profile selection required before accessing protected content.

---

### `POST /api/auth/select-profile`

**Auth:** requireAccount (partial token acceptable)

**Body:**
```json
{
  "profileId": "...",
  "pin": "1234"
}
```

`pin` is required only if the profile has a PIN set.

**Response:** Returns a full JWT (accountId + profileId + ageGroup).

---

### `POST /api/auth/logout`

**Auth:** requireAccount

**Response:** Clears the refresh token cookie.

---

### `POST /api/auth/refresh`

**Auth:** None (uses refresh token from HTTP-only cookie)

**Response:** Returns a new access token. Requires a valid, non-expired refresh token cookie.

---

### `GET /api/auth/google`

**Auth:** None

Redirects to Google OAuth2 consent screen. On completion, redirects back to `/api/auth/google/callback`.

---

### `GET /api/auth/google/callback`

**Auth:** None

Handled by Passport.js. On success, creates or finds Account and returns partial JWT.

---

### `GET /api/auth/facebook`

**Auth:** None

Redirects to Facebook OAuth2 consent screen.

---

### `GET /api/auth/facebook/callback`

**Auth:** None

Handled by Passport.js. On success, creates or finds Account and returns partial JWT.

---

## Profile

### `GET /api/profiles`

**Auth:** requireAccount

**Response:** All profiles belonging to the authenticated account.

```json
[
  { "id": "...", "displayName": "Banele", "ageGroup": "adult", "isOwner": true },
  { "id": "...", "displayName": "Siya", "ageGroup": "child", "isOwner": false }
]
```

---

### `POST /api/profiles`

**Auth:** requireOwner

**Body:**
```json
{
  "displayName": "Siya",
  "ageGroup": "child",
  "dateOfBirth": "2021-01-15",
  "pin": "1234"
}
```

**Response:** The new Profile document. Limited to 6 profiles per account — returns 400 if limit reached.

---

### `GET /api/profiles/me`

**Auth:** requireProfile

**Response:** The currently selected profile.

---

### `PATCH /api/profiles/me`

**Auth:** requireProfile

**Body:** Any subset of updatable profile fields (displayName, avatarUrl, preferences, etc.)

---

### `PATCH /api/profiles/me/setup`

**Auth:** requireProfile

**Body:**
```json
{
  "education": "grade-11",
  "dateOfBirth": "2009-03-22"
}
```

Sets `isSetupComplete: true` when the setup wizard is finished.

---

### `DELETE /api/profiles/:profileId`

**Auth:** requireOwner

Deletes a non-owner profile. The owner profile cannot delete itself.

---

### `POST /api/profiles/:profileId/pin`

**Auth:** requireOwner

**Body:** `{ "pin": "1234" }`

Sets or updates the PIN on a profile.

---

### `DELETE /api/profiles/:profileId/pin`

**Auth:** requireOwner

Removes the PIN from a profile.

---

### `GET /api/profiles/me/stats`

**Auth:** requireProfile

**Response:** Aggregate learning stats for the current profile (total XP, peanuts, terms mastered, streak).

---

## Content Navigation

These endpoints browse the content hierarchy. No learning data — just structure.

### `GET /api/content/fields`

**Auth:** requireProfile

**Response:** All active Fields.

```json
[{ "id": "...", "name": "Language", "slug": "language" }]
```

---

### `GET /api/content/fields/:fieldSlug/subjects`

**Auth:** requireProfile

**Response:** All Subjects within the specified Field.

---

### `GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/courses`

**Auth:** requireProfile

**Response:** All Courses within the specified Subject, each with its Roadmap populated as `{ _id, title, description, nodeCount }` (node count only — not the full node list; fetch `GET /api/roadmap/course/:courseId` for full detail).

---

### `GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/courses/:courseSlug`

**Auth:** requireProfile

**Response:** A single Course document with `roadmapId` (summary) and `miniAppIds` (full MiniApp documents) populated.

---

### `GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/miniapps`

**Auth:** requireProfile

**Response:** All MiniApps within the specified Subject, filtered by the profile's ageGroup.

---

### `GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/miniapps/:miniAppSlug`

**Auth:** requireProfile

**Response:** A single MiniApp document with its full details.

---

## Vocabulary

### `GET /api/vocab/search?word=&miniAppId=`

**Auth:** requireProfile

**Query params:**
- `word` — the search string (required)
- `miniAppId` — the mini-app context (required)

**Response:** Matching terms. If the word is not in the database, calls the Dictionary API to fetch and store it. Results are filtered by the profile's ageGroup (e.g. a `child` profile sees at most 1 definition).

---

### `GET /api/vocab/terms/:termId`

**Auth:** requireProfile

**Response:** Full term document including definitions. Definitions filtered by ageGroup.

---

### `POST /api/vocab/bucket`

**Auth:** requireProfile

**Body:**
```json
{
  "termId": "...",
  "definitionId": "...",
  "miniAppId": "..."
}
```

Adds a term+definition to the learner's bucket. Creates a BucketEntry and initialises a LearningRecord (`status: 'unseen'`).

**Errors:** 409 if the entry already exists.

---

### `DELETE /api/vocab/bucket/:termId`

**Auth:** requireProfile

Removes all BucketEntries for this term from the current profile's bucket.

---

### `GET /api/vocab/bucket?miniAppId=&status=&page=&limit=`

**Auth:** requireProfile

**Query params:**
- `miniAppId` — required
- `status` — optional filter (`learning`, `mastered`, `paused`)
- `page`, `limit` — pagination

**Response:** Paginated list of BucketEntries with populated term and definition data, and the corresponding LearningRecord for each.

---

### `GET /api/vocab/recent?miniAppId=`

**Auth:** requireProfile

**Response:** Recently added terms for the current profile in the specified mini-app.

---

### `GET /api/vocab/trending?miniAppId=&limit=`

**Auth:** requireProfile

**Response:** Most frequently added terms across all profiles in the specified mini-app.

---

### `GET /api/vocab/dictionary?miniAppId=&letter=&page=&limit=`

**Auth:** requireProfile

**Query params:**
- `miniAppId` — required
- `letter` — filter by first letter (A–Z)
- `page`, `limit` — pagination

**Response:** Paginated alphabetical term list.

---

### `GET /api/vocab/dictionary/alphabet?miniAppId=`

**Auth:** requireProfile

**Response:** Array of letters that have at least one term in the specified mini-app.

```json
["A", "B", "C", "D", "E", "F"]
```

---

## Quiz

### `POST /api/quiz/session`

**Auth:** requireProfile

**Body:**
```json
{
  "miniAppId": "...",
  "settings": {
    "questionCount": 10,
    "questionTypes": ["mcq_term_to_def", "true_false_term_def"],
    "bucketFilter": "learning"
  }
}
```

Creates a new QuizSession. Selects questions according to priority: review-due terms first, then active learning terms, then unseen terms.

**Response:** Session document with the first question.

---

### `GET /api/quiz/session/:sessionId`

**Auth:** requireProfile

**Response:** The current session state including all question IDs and current results.

---

### `POST /api/quiz/session/:sessionId/answer`

**Auth:** requireProfile

**Body:**
```json
{
  "questionId": "...",
  "rawResponse": "the answer",
  "selectedOptionIndex": 2,
  "timeToAnswerMs": 3400,
  "wasSkipped": false
}
```

For DnD questions, `rawResponse` must be: `JSON.stringify({ placements: [{ draggableId: "...", dropZoneId: "..." }] })`

**Response:** Whether the answer was correct, points awarded, the correct answer, and the updated confidence score.

---

### `PATCH /api/quiz/session/:sessionId/complete`

**Auth:** requireProfile

Marks the session as completed. Calculates final results.

**Response:** Full results summary.

---

### `PATCH /api/quiz/session/:sessionId/abandon`

**Auth:** requireProfile

Marks the session as abandoned. Partial results are preserved.

---

### `GET /api/quiz/session/:sessionId/results`

**Auth:** requireProfile

**Response:** Full results for a completed or abandoned session.

---

## Roadmap

A RoadmapNode contains an ordered, heterogeneous `items[]` — each item is either `'lesson'`
(pure study material) or `'quiz'` (references a Quiz document directly, no wrapper Lesson).
See `docs/technical/data-models.md` for the full RoadmapNode/Lesson/ProfileRoadmapProgress
field reference.

### `GET /api/roadmap/course/:courseId`

**Auth:** requireProfile

**Response:** The Roadmap wrapped by the specified Course, with all nodes (each with resolved `items[]`) and the current profile's progress (locked/unlocked/completed, stars, best score). Resolved via `Course.findById(courseId)` → `course.roadmapId`.

---

### `GET /api/roadmap/node/:nodeId`

**Auth:** requireProfile

**Response:** Full node detail — resolved `items[]` (each lesson item includes the full Lesson document with `resources[]`; each quiz item includes `{ _id, title, questionCount }`) and the profile's progress on this node.

---

### `GET /api/roadmap/lesson/:lessonId`

**Auth:** requireProfile

**Response:** `{ lesson, progress, isUnlocked }` — the Lesson document (`resources[]`) and the profile's item-progress entry. A lesson never has questions attached; those live exclusively on quiz items.

---

### `POST /api/roadmap/lesson/:lessonId/study`

**Auth:** requireProfile

Marks a lesson's resources as viewed. Every lesson item unconditionally auto-completes (a Lesson is always "just study material" — no pass/fail gating), cascading to unlock the next item or node. Returns `{ progress, itemCompleted, nodeCompleted, nextItemId, nextItemType, rewards }` — the frontend uses `nextItemId`/`nextItemType` to auto-navigate straight to the next item (`'lesson'` → the lesson route, `'quiz'` → the quiz-item route) instead of requiring a manual "back to roadmap" click.

---

### `POST /api/roadmap/node/:nodeId/item/:itemId/start`

**Auth:** requireProfile

Starts a quiz session for a `'quiz'`-type item. `itemId` **is** the Quiz id — `createQuizSession(profileId, itemId)` is called directly, no indirection through a wrapper Lesson. Returns `{ session, firstQuestion }`.

**Errors:** 403 if the item is still locked (prerequisites not met).

---

### `POST /api/roadmap/node/:nodeId/item/:itemId/complete`

**Auth:** requireProfile

**Body:**
```json
{
  "sessionId": "..."
}
```

Scores the session's AnswerRecords against the item's `passingScore` (from the node's `items[]` ref — `0` always passes, reproducing the old "practice" auto-pass behavior). On pass, unlocks the next item, or completes the node (awarding stars if this was the last item) and unlocks any dependent nodes. Returns `{ itemCompleted, nodeCompleted, nextItemId, nextItemType, rewards }` — the frontend auto-navigates to `nextItemId` (using `nextItemType` to pick the right route) after a brief pause on a pass, or back to the roadmap overview if there's no next item.

---

## Admin

These endpoints are not exposed to regular users. They are used for content management and question generation monitoring.

### `POST /api/admin/generate-questions`

**Body:**
```json
{
  "termId": "...",
  "definitionId": "..."
}
```

Triggers the full question generation pipeline for one term+definition pair. Generates non-AI questions immediately and AI questions asynchronously.

---

### `GET /api/admin/generation-status?miniAppId=`

**Response:** Count of terms by `aiGenerationStatus` for the specified mini-app.

```json
{
  "pending": 3,
  "complete": 47,
  "failed": 1,
  "not_needed": 0
}
```

---

### `POST /api/admin/retry-failed-generation`

Retries AI question generation for all terms with `aiGenerationStatus: 'failed'` that have fewer than 3 attempts.

---

## Dashboard (Content Studio)

All `/api/dashboard/*` routes require `[requireProfile, requirePlatformAdmin]` — `req.profile.isPlatformAdmin` must be `true` (no granting UI yet; set directly in MongoDB). This is the authoring backend for the Course → Node → Lesson/Quiz → Question flow plus the shared asset library, described in `docs/content/content-studio-design.md`. Every Quiz/Question created through this namespace gets `miniAppId` set to the **Course's `_id`** — there's no MiniApp document for roadmap content, this is the same convention the Course/Roadmap migration already established. Every delete in this namespace is a **soft delete** (`isActive: false`); nothing here ever hard-deletes, since learner progress can already be attached by the time something gets edited.

### `POST /api/dashboard/assets/upload`

**Auth:** requireProfile + requirePlatformAdmin

**Body:** multipart form — `file` + `type` (`'images' | 'audio' | 'video' | 'documents'`)

**Response:** `{ path, url }` — `path` is the GCS-relative path to store on the referencing document (e.g. `IDraggable.imageUrl`); `url` is the full display URL.

Uploads land under `question-media/{type}/`. No tracking collection — GCS itself is the index.

---

### `GET /api/dashboard/assets?type=&search=`

**Auth:** requireProfile + requirePlatformAdmin

**Query params:**
- `type` — required, one of `images`, `audio`, `video`, `documents`
- `search` — optional, filters by filename substring

**Response:** Array of `{ name, path, url, size, updatedAt }`, newest first.

---

### `POST /api/dashboard/courses`

**Auth:** requireProfile + requirePlatformAdmin

**Body:**
```json
{
  "subjectId": "...",
  "name": "Phonics",
  "slug": "phonics",
  "description": "...",
  "curriculumTags": [{ "curriculum": "CAPS", "gradeLevel": "r" }]
}
```

Creates an empty `Roadmap` first, then the `Course` pointing at it. If the (subjectId, slug) pair already exists, the just-created Roadmap is rolled back and a 409 is returned.

**Errors:** 404 if `subjectId` doesn't resolve to an active Subject. 409 on a duplicate slug within the subject.

---

### `PATCH /api/dashboard/courses/:courseId`

**Auth:** requireProfile + requirePlatformAdmin

**Body:** any subset of `name`, `description`, `iconUrl`, `miniAppIds`, `curriculumTags`. `subjectId`/`slug`/`roadmapId` are structural and not editable here.

---

### `DELETE /api/dashboard/courses/:courseId`

**Auth:** requireProfile + requirePlatformAdmin

Soft-deletes the Course only (`isActive: false`). The Roadmap/nodes/lessons/quizzes/questions underneath are left untouched — just no longer reachable via an active course.

---

### `POST /api/dashboard/courses/:courseId/nodes`

**Auth:** requireProfile + requirePlatformAdmin

**Body:**
```json
{
  "title": "Vowel Sounds",
  "slug": "vowel-sounds",
  "description": "...",
  "curriculumTags": [{ "curriculum": "CAPS", "gradeLevel": "r" }]
}
```

Creates a `RoadmapNode` on the course's roadmap (`position` = current node count + 1) and appends `{ nodeId, position }` to `Roadmap.nodes[]`.

**Errors:** 404 if the course doesn't exist. 409 if a node with this slug already exists on the roadmap.

---

### `PATCH /api/dashboard/nodes/:nodeId`

**Auth:** requireProfile + requirePlatformAdmin

**Body:** any subset of `title`, `description`, `curriculumTags`, `unlockRequires`, `rewards`. Not `slug` or `position` — those only change via the reorder route below.

---

### `PATCH /api/dashboard/courses/:courseId/nodes/reorder`

**Auth:** requireProfile + requirePlatformAdmin

**Body:** `{ "nodeIds": ["...", "...", "..."] }` — the full ordered list of the course's node ids.

Rewrites `Roadmap.nodes[]` to this order and updates each `RoadmapNode.position` to match, so the two copies of ordering data never drift apart.

**Errors:** 400 if `nodeIds` isn't exactly the roadmap's current set of nodes (missing, extra, or duplicate ids).

---

### `DELETE /api/dashboard/nodes/:nodeId`

**Auth:** requireProfile + requirePlatformAdmin

Soft-deletes the node and removes its entry from `Roadmap.nodes[]`, renumbering the remaining entries (and their `RoadmapNode.position` fields) so there's no gap.

---

### `POST /api/dashboard/nodes/:nodeId/lessons`

**Auth:** requireProfile + requirePlatformAdmin

**Body:**
```json
{
  "title": "Let's Play!",
  "resources": [{ "type": "notes", "position": 1, "markdown": "..." }]
}
```

Creates a `Lesson` (`position` = current `node.items.length + 1`) and appends `{ itemType: 'lesson', itemId, position }` to `RoadmapNode.items[]`. `resources[]` entries with a `url` are expected to already be GCS paths from the asset-upload endpoint — this route doesn't handle file upload itself.

---

### `PATCH /api/dashboard/lessons/:lessonId`

**Auth:** requireProfile + requirePlatformAdmin

**Body:** any subset of `title`, `resources`.

---

### `DELETE /api/dashboard/lessons/:lessonId`

**Auth:** requireProfile + requirePlatformAdmin

Soft-deletes the lesson and removes its entry from the parent `RoadmapNode.items[]`, renumbering the remaining items (and syncing any remaining Lesson documents' `position` fields to match).

---

### `POST /api/dashboard/nodes/:nodeId/quizzes`

**Auth:** requireProfile + requirePlatformAdmin

**Body:**
```json
{
  "title": "Vowel Sounds Quiz",
  "settings": { "feedbackMode": "immediate", "shuffleQuestions": false }
}
```

Creates a `Quiz` (`mode: 'fixed'`, `miniAppId: <course._id>`, `questionIds: []`, `isUserAdjustable: false`, `isDefault: false`) and appends `{ itemType: 'quiz', itemId, position }` to `RoadmapNode.items[]`. `settings.questionCount` always starts at `0` regardless of what's passed — it tracks `questionIds.length`, not an independently editable number.

---

### `PATCH /api/dashboard/quizzes/:quizId`

**Auth:** requireProfile + requirePlatformAdmin

**Body:** any subset of `title`, `settings`. Not `mode`, not `miniAppId`. If `settings` is included, `questionCount` is always recomputed from the current `questionIds.length`, ignoring any value passed in.

---

### `PATCH /api/dashboard/quizzes/:quizId/questions`

**Auth:** requireProfile + requirePlatformAdmin

**Body:** `{ "questionIds": ["...", "...", "..."] }` — full ordered replacement list (not a partial add/remove).

Also updates `settings.questionCount` to match the new length.

**Errors:** 400 if any `questionId` doesn't resolve to an active Question.

---

### `DELETE /api/dashboard/quizzes/:quizId`

**Auth:** requireProfile + requirePlatformAdmin

Soft-deletes the quiz and removes its entry from the parent `RoadmapNode.items[]`, renumbering the remaining items.

---

### `POST /api/dashboard/questions`

**Auth:** requireProfile + requirePlatformAdmin

**Body:**
```json
{
  "courseId": "...",
  "type": "mcq_term_to_def",
  "content": { "prompt": "...", "options": ["...", "..."], "correctAnswer": "...", "explanation": "..." },
  "termId": "...",
  "definitionId": "...",
  "maxPoints": 4,
  "pointsCanBePartial": false
}
```

`miniAppId` is resolved from `courseId`. `maxPoints` defaults from `DEFAULT_MAX_POINTS[type]` if omitted. Always created with `source: 'manual'`, `isGeneric: true`, `profileId: null`. Content-shape validation (DnD needs `draggables`/`dropZones`, non-DnD needs `prompt`) is enforced by the `Question` schema's own `pre('validate')` hook — a failed save surfaces as a 400 with the validation message, not a separately-coded check.

**Errors:** 404 if `courseId` doesn't resolve to an active Course. 400 on a content-shape validation failure.

---

### `PATCH /api/dashboard/questions/:questionId`

**Auth:** requireProfile + requirePlatformAdmin

**Body:** any subset of `content`, `maxPoints`, `pointsCanBePartial`. Same `pre('validate')`-backed 400 behavior as create.

---

### `DELETE /api/dashboard/questions/:questionId`

**Auth:** requireProfile + requirePlatformAdmin

Soft-deletes the question. If it's still referenced by an active `Quiz.questionIds`, a warning is logged server-side — the delete is not blocked and the reference is not cleaned up.

---

### `GET /api/dashboard/questions?courseId=&search=`

**Auth:** requireProfile + requirePlatformAdmin

**Query params:**
- `courseId` — required, scopes the list via `miniAppId: courseId`
- `search` — optional, matches against `content.prompt`, falling back to `content.correctAnswer` for DnD types (which have no `prompt`)

**Response:** Active questions for the course, newest first — backs the "add existing question to this quiz" picker in the quiz editor.

---

*Last updated: July 2026*

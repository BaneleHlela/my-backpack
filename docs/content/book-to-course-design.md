# Book-to-Course Pipeline — Design

**Status:** Built (August 2026). Scope: one specific book, uploaded manually in Studio, turned
into a course's Topics + a curated/personal question-generation pair, plus AI Helper
book-grounding. Not a general "any PDF becomes a course" tool — no reusable multi-book wizard,
no book library, no re-import flow. Generalize later if it's actually needed, per this
project's standing "we are not scaling yet" rule.

The uploaded PDF and its extracted text are **backend-only**: no PDF viewer, no PDF resource,
nothing book-shaped ever reaches the mobile or web learner UI. Learners read the physical book;
the app only points them at which pages to read (via a draft Lesson) and quizzes them after.

---

## Two corrections that shaped this build

Both found by re-checking the live repo against earlier planning, before writing any code —
worth keeping visible here since the reasoning isn't obvious from the code alone.

**1. `ProfileRoadmapProgress.currentNodeId` is dead.** It's declared on the schema
(`profileRoadmapProgress.model.ts`) but never set or written anywhere in `roadmap.service.ts` —
grep confirms it. The live signal for "which node is this learner currently on" is
`nodeProgress` (a `Map<nodeId, INodeProgressEntry>`): scan for the entry with
`status: 'in_progress'`, taking the most recently attempted one if several qualify (branching
`unlockRequires` can leave more than one node unlocked/in-progress at once). Phase 4b's
`getPracticeQuestionsForProfile` (in `aiChat.service.ts`) does exactly this —
`findCurrentNodeId()` — and falls back to a slice from the start of the book if the learner
hasn't started the roadmap yet, rather than failing the request.

**2. AI-generated book questions set `nodeId` explicitly — a deliberate divergence.** Studio's
existing `createQuestion` (`studio/question.service.ts`) hardcodes `source: 'manual',
isGeneric: true, profileId: null` and never sets `nodeId` — it relies entirely on a question
being added to a node's Quiz `questionIds[]` for that association; a question with no quiz has
no traceable node. Both Phase 4 generators (`nodeBookQuestions.ts` for 4a,
`aiChat.service.ts`'s `getPracticeQuestionsForProfile` for 4b) set `nodeId` on every question
they create. This isn't an inconsistency to fix later — it's intentional, because 4b's
questions are never added to any Quiz (they're rendered inline in chat and discarded), so
`nodeId` is the *only* way to trace a personal practice question back to the chapter it came
from.

---

## Phase 2: extraction vs. judgment, kept in separate files

The project's standing rule — AI is for judgment, not mechanical work — maps directly onto two
files in `apps/api/src/services/bookIngestion/`:

- **`pdfExtraction.ts` (2a, mechanical).** `extractPdfText(gcsPath)` downloads the PDF bytes
  from GCS and runs `pdf-parse` (the classic 1.x callable API — `pdf-parse@2.x` ships a
  completely different `PDFParse` class-based surface with no default export, so the dependency
  is deliberately pinned to `pdf-parse@1.1.1`, not left on `^` latest). This must never call
  Claude, and never does — it's exact, deterministic text extraction.
- **`chapterStructure.ts` (2b, judgment).** `suggestChapterStructure(extractedText)` asks Claude
  to propose a chapter list *mirroring the book's own structure* — the prompt explicitly
  forbids inventing chapters the book doesn't have. Persists nothing; it's a preview the admin
  reviews and edits in Studio before anything is created (Phase 3).

`POST /courses/:courseId/suggest-structure` runs both in sequence and returns
`{ chapters, extractedText }` — the frontend holds `extractedText` in memory to submit back to
`book-chapters` rather than re-extracting the PDF a second time.

### Model selection

`modelSelection.ts` is the one shared piece between Phase 2b and Phase 5 (AI Helper
book-grounding) — `pickModelForBookText(bookText)` switches from Haiku
(`claude-haiku-4-5-20251001`, matching the rest of the codebase's convention) to Sonnet
(`claude-sonnet-5`) when a rough `chars/4` token estimate crosses
`BOOK_TEXT_SONNET_TOKEN_THRESHOLD` (150,000 tokens) — a long book needs more room to reason
across its whole text in one pass than Haiku comfortably gives. The threshold is a single named
constant specifically so both call sites move together if it's ever retuned.

---

## Phase 3: approval is a separate, explicit step

`chapterIngestion.ts`'s `createChaptersFromBook` takes the admin-edited chapter list (titles/
ranges may have changed, chapters may have been added, removed, or reordered from Phase 2's
proposal) and, in order: sets `Course.bookSource`, then for each chapter calls the *existing*
`createNode`/`createLesson` from `studio/node.service.ts`/`studio/lesson.service.ts` — the exact
same functions Studio's hand-authoring UI calls, not a parallel code path. Each chapter gets one
`RoadmapNode` and one draft `'Reading'` Lesson with a single `notes` resource
(`Read pages X–Y: *Title*`) — a starting point, editable afterward through the normal lesson
editor like any other lesson.

This phase deliberately does **not** create quizzes. That's Phase 4, kept separate so an admin
can fix chapter boundaries (a chapter's page range, or a chapter Claude mis-split) before
spending an AI call generating questions against content that's about to change.

---

## Phase 4: one generator, two entry points — official vs. personal

`chapterQuestions.ts`'s `generateChapterQuestions(chapterText, count)` is the single shared
generator both entry points call. It asks for a mix of `mcq` / `true_false` / `text_input`
questions, with one hard rule baked into the prompt: **any question involving a calculation or
numeric answer must be MCQ with numeric answer choices, never `text_input`.**
`quizSession.service.ts` grades every text-input type on an exact lowercase-and-trim string
match with no numeric tolerance, so a typed `"9.8"` vs. a "correct" `"9.8 m/s²"` would fail for
reasons that have nothing to do with whether the learner understood the material. MCQ sidesteps
grading entirely.

Validation reuses `questionGeneration/questionValidator.ts`'s `validateQuestion` — the one
actually exercised elsewhere in the app (via `questionGeneration/index.ts`) — rather than the
unused `validateAiResponse`. That second function is dead code today (nothing calls it) and has
a latent bug for this use case: it rejects any item whose `options` array isn't exactly length
4, which would incorrectly reject every `true_false` item's legitimate 2-option shape
(`["True", "False"]`). `validateQuestion` already validates each type's options shape correctly,
so nothing is lost by relying on it alone.

### 4a — official, Studio-triggered, curated

`nodeBookQuestions.ts`'s `createBookQuestionsForNode(nodeId, count)`. Takes a rough proportional
slice of the course's book text for this node — split by the node's *position* among the
roadmap's active nodes, not by parsed page numbers (`chapterTextSlice.ts`'s `sliceChapterText`;
exact page-accurate slicing is a documented nice-to-have, not required for v1). Saves the
generated questions as ordinary shared `Question` documents (`source: 'ai'`, `isGeneric: true`,
`profileId: null`, `nodeId` set — see the correction above) and wraps them in a new
`mode: 'fixed'` Quiz with `questionIds` pre-populated in a single write, attached to the node's
`items[]`. Editable afterward through the existing question/quiz editors like any other
AI-generated content in this codebase.

### 4b — personal, chat-triggered, on-demand

`aiChat.service.ts`'s `getPracticeQuestionsForProfile(profileId, courseId)`, backing the AI
Helper's "Quiz me on this chapter" suggested action. Resolves the learner's current chapter via
the correction above, generates a small batch (5) of questions from that slice, and saves them
with `isGeneric: false`, `profileId` set — **never** added to the shared course-wide question
pool, so an idle "quiz me" tap from one learner can't pollute what every other learner
eventually sees in that course's question bank. Treated as an ordinary AI Helper turn for
rate-limiting (reuses `aiChat.service.ts`'s existing `checkRateLimit` — same 5s cooldown / 50
messages-per-day derived from the `AiChatMessage` collection) but does **not** write an
`AiChatMessage` itself; the questions are returned directly and rendered as a lightweight inline
widget (`PracticeQuestionsCard`, web and mobile) that isn't wired into `QuizSession`/
`AnswerRecord` at all — no progress tracking, purely a chat-adjacent practice moment.

---

## Phase 5: AI Helper book-grounding

`aiChatHelper.service.ts`'s `buildSystemPrompt` now returns an array of system content blocks
instead of a single string, so the book text can be its own `cache_control: { type:
'ephemeral' }` breakpoint — cacheable across every turn of that course's chat, since the same
book text is reused turn after turn. Ordering matters for cache hits (system renders after
`tools`, before `messages`): the book-text block comes **first**, ahead of the smaller
per-turn persona/course-context block, since the larger and more stable content has to lead for
the breakpoint to actually help.

`aiChat.service.ts`'s `sendChatMessage` passes `course.bookSource?.extractedText` straight
through as `bookText` — no extra fetch, `course` is already loaded for `courseName`/
`subjectName`. Model selection reuses `modelSelection.ts`'s `pickModelForBookText` (see Phase 2
above) rather than redefining the threshold a second time.

---

## Addendum: long-context "lost in the middle" fix

Real testing against a genuine graduate-level textbook (Sean Carroll's *Spacetime and
Geometry*) surfaced a failure mode neither `chapterStructure.ts` nor `chapterQuestions.ts` had
been tested against: both prompts put the raw book/chapter excerpt at the very end of the
prompt, immediately before generation. On a large or content-dense excerpt — and a textbook's
own worked examples and end-of-chapter problem sets are exactly this — the model would
sometimes drift into continuing the excerpt's own pattern (e.g. producing prose that "answers"
practice questions it had just read) instead of following the JSON-array instruction given
earlier in the prompt. This is a well-documented long-context failure mode ("lost in the
middle"), not a one-off prompt bug.

Fixed two ways, both in `bookIngestion/`:

1. **Recency-anchored reminder.** Both prompts now repeat the strict output-format instruction
   — plus an explicit "the text above may contain questions; do not answer them" — immediately
   after the excerpt, so the last thing the model reads before generating is the instruction,
   not the book's own content.
2. **Resilient parsing.** New `aiJson.ts`'s `cleanAndParseJsonArray(rawText, context)` replaces
   the bare `JSON.parse` both files used. It still tries a direct parse first; if that fails (the
   model prefaced the array with prose despite the reminder), it falls back to slicing out the
   first `[` … last `]` substring in the response and parsing that, before giving up and
   throwing.

Both are defensive, not correctness-changing — a well-behaved response parses exactly the same
way it always did.

## Addendum: JSON body-size limit

The same real-book testing also hit `PayloadTooLargeError` on `POST /courses/:courseId/
book-chapters` — its body round-trips the whole book's `extractedText` as plain JSON (Phase 3
re-submits exactly what Phase 2's `suggest-structure` returned), and Express's default
`express.json()` body limit is 100kb, nowhere near enough for a real book's extracted text
(1.4MB+ for a graduate textbook). Fixed globally in `app.ts` — `express.json({ limit: '25mb' })`
— rather than scoping a special limit to just this one route, matching the existing "one
blanket cap for simplicity" convention the 250MB multer limit on asset uploads already
established.

## What's out of scope for this pass

- No re-import / re-sync flow if the PDF changes after chapters are created — a second
  `book-chapters` call would create duplicate nodes (slug collision aside), not update existing
  ones.
- No exact page-accurate text slicing — both Phase 4 entry points use a rough proportional
  split by node position, not the chapter's actual `startPage`/`endPage`.
- No multi-book courses, no book library/browse UI, no removing a book once attached.
- Mobile Studio parity — the book-import wizard (`ImportBookModal.tsx`) is web-only, matching
  Content Studio's existing web-only footprint.

# Vowels DnD Quiz — Design

Design decisions for the first real DnD quiz build: isiZulu onkamisa (vowels) and
English vowels, under the generic subjects (not yet linked to grade roadmaps).

> **Update:** the "7 lessons" model described below (§1) was the original design, built
> when `RoadmapNode` only ever contained `Lesson` documents. It was superseded by the
> `RoadmapNode.items[]` model: the node now has **7 items** — 1 `'lesson'` item (the video
> intro) + 6 `'quiz'` items referencing Quiz documents directly (no wrapper Lesson). The
> escalation table, question content, and marking rules below are otherwise unchanged — only
> the container changed from "6 quiz-wrapper Lessons" to "6 direct quiz items", each carrying
> its own `passingScore` on the node's item ref instead of on a Lesson. See
> `docs/technical/data-models.md` for the current schema.

---

## 1. Lesson sequence (applies to both languages)

One RoadmapNode ("Vowels" / "Izinhlamvu Zokuvuma"), seven items — 1 lesson item + 6 quiz
items:

| # | Title | Item type | Draggables | Audio-on-tap | Question count | Pass mark |
|---|---|---|---|---|---|---|
| 1 | Meet the Vowels (video) | lesson | — | — | — | — |
| 2 | Learn to Drag | quiz | 1 (target only) | ON | 10 | 100% |
| 3 | Learn to Drag — Solo | quiz | 1 (target only) | OFF | 10 | 100% |
| 4 | Pick the Sound | quiz | 2 (target + 1 distractor) | ON | 10 | 100% |
| 5 | Pick the Sound — Solo | quiz | 2 (target + 1 distractor) | OFF | 10 | 100% |
| 6 | All the Vowels | quiz | 5 (all) | ON | 10 | 100% |
| 7 | Vowels Challenge | quiz | 5 (all) | OFF | 10 | 100% |

All six quiz items use question `type: 'dnd_single'` — one drop zone, one correct
draggable, distractor count is what escalates (1 → 2 → 5). "Audio-on-tap" means
`IDraggable.audioUrl` is populated (existing behaviour — "audio played when item is
tapped"); "OFF" variants simply omit it. No new helper flags needed.

10 questions per quiz item, built by cycling the 5-vowel set twice
(`[...vowels, ...vowels]`) so each vowel appears exactly twice per quiz.

Marking: fixed question count + fixed pass % (`passingScore: 1.0` on the node's item ref)
for these roadmap quiz items. Confidence-threshold marking (using the existing
`LearningRecord.confidenceScore` / `AdaptiveProfile.masteryThreshold`) is reserved for
dynamic quizzes later — not used here.

**Unskippable mode:** all 6 quiz variants (both languages) set
`defaultHelpers.retryUntilCorrect: true`. A wrong drop is rejected entirely client-side in
`DndSinglePattern` — checked against `content.dropZones[0].requiredDraggableIds` before ever
calling `onAnswer` — so it's never submitted to the server (no AnswerRecord, no partial-credit
scoring) and bounces back to the pool with a brief red flash + the question's
`tryAgainFeedback` audio. The host quiz page hides its "Skip question" button whenever the current question resolves `retryUntilCorrect: true`. The learner cannot move to the next
question without first getting the current one right.

**Auto-advance:** passing a quiz item (or completing a lesson item) now auto-navigates
straight to the next item in the node after a short pause (so the learner sees their score
first) — no manual "back to roadmap" click needed between items. See
`POST /roadmap/lesson/:lessonId/study` and `POST /roadmap/node/:nodeId/item/:itemId/complete`
in `docs/technical/api-reference.md`, which both now return `nextItemId`/`nextItemType`.

---

## 2. Question element mapping (no schema changes needed)

| Requirement | Existing field |
|---|---|
| Teacher avatar asking the question | `content.avatar` (`IAvatarConfig`) |
| Audio plays on tap/drag | `draggable.audioUrl` |
| Text question display | `content.avatar.dialogue` (used as the on-screen prompt for DnD types, since `content.prompt` is reserved for non-DnD types) |
| Hint button | `defaultHelpers.hintsAllowed` / `hintDelaySeconds` / `animateHint` |
| Replay audio | Frontend control re-triggering `draggable.audioUrl` or `avatar.dialogueAudioUrl` — no schema needed |
| Submit auto vs manual | `defaultHelpers.autoSubmit` |
| Drag back out | `defaultHelpers.allowUndo` |

Layout (v1, functionality over styling): top half = draggable items in plain text/font
(no icons yet), bottom half = single drop zone styled as a classroom board/bucket.
Teacher avatar optional in v1, styled in a later pass.

---

## 3. Schema additions (Phase 0 — blocking)

### 3a. Term.word unique index (re-confirming existing known issue)

`term.model.ts` currently has `word: { unique: true, ... }` (global) **in addition to**
a non-unique `{ miniAppId: 1, word: 1 }` index. This was identified before but not yet
applied to the codebase. English vowels (`a, e, i, o, u`) will collide with the
existing isiZulu vowel Terms under the current global-unique index.

Fix: remove `unique: true` from the `word` field; make the compound index unique:
`termSchema.index({ miniAppId: 1, word: 1 }, { unique: true })`. Drop the old
`word_1` index in MongoDB (defensive `dropIndex` in the seed runner, catching
"index not found" so re-runs are safe).

### 3b. Question.seedKey (new, optional field)

Each of the 6 quiz variants needs its own hand-authored `dnd_single` Question per
vowel, and each vowel appears **twice** within one quiz (10 questions / 5 vowels).
The existing upsert pattern (`{ termId, type }`) can't distinguish six different
variants of "vowel a, dnd_single" from each other, or the two occurrences within one
quiz.

Add `Question.seedKey?: string` (indexed, sparse, not unique — used only by seed
scripts as the idempotent upsert key, e.g.
`"isizulu-vowels-learn-drag-audio-a-1"`). Not used anywhere else in application logic.

---

## 4. Content hierarchy — English Phonics

New topic under the existing generic `english` subject, mirroring isiZulu's `sounds`
topic:

```
Language (field)
  English (subject)
    Phonics (topic, NEW)
      Phonics Roadmap (miniApp, type: roadmap, slug: 'roadmap', NEW)
```

Node 1 in the Phonics Roadmap = "Vowels" (mirrors isiZulu's node 1 = "Izinhlamvu
Zokuvuma"). Future nodes (consonants, blends) slot in later the same way isiZulu's
node 2 (consonants) will.

English vowels teach **letter names** (A, E, I, O, U) for this build — matches
isiZulu's letter-to-sound simplicity. Specific vowel *sounds* (short "a" as in cat,
etc.) are a separate, later topic.

---

## 5. Audio asset convention

```
sounds/isizulu/vowels/{letter}.mp3        — EXISTING, vowel sound, draggable audio
sounds/isizulu/feedback/correct-{letter}.mp3   — EXISTING
sounds/isizulu/feedback/try-again.mp3          — EXISTING
sounds/isizulu/avatar/zoe-vowels-intro.mp3     — NEW, avatar intro dialogue

sounds/english/vowels/{letter}.mp3        — NEW, letter NAME spoken (e.g. "ay" for A)
sounds/english/feedback/correct-{letter}.mp3   — NEW
sounds/english/feedback/try-again.mp3          — NEW
sounds/english/avatar/zoe-vowels-intro.mp3     — NEW

The intro lesson's `studyMaterial.videoUrl` is
`https://www.youtube.com/watch?v=gp1UmVSlLJ4` for both languages (same video, reused
until language-specific videos exist).
```

Avatar: reusing `avatarId: 'zoe'` for both languages for now (no separate avatar
catalog exists yet) — trivial to change later.

---

## 6. Restructuring the existing IsiZulu node

The "Izinhlamvu Zokuvuma" node ended up at the 7-item structure above (1 lesson item + 6
quiz items) via two successive migrations: first from 3 lessons (introduction / practice /
assessment) to 7 quiz-wrapper lessons, then from those wrapper lessons to direct quiz items
on `node.items[]`. Each migration deleted the superseded Lesson/Quiz documents (by
position/title match) rather than leaving them orphaned, since the seed system favours
idempotent upsert, not accumulation. The existing `mcq_audio` "listening" questions and
their Term/Definition docs are untouched and kept throughout (still valid content, just not
wired into `node.items[]` — only the 6 dnd_single quiz variants are).

---

## 7. Out of scope this session (deferred, design only)

- **Portal-node roadmap linking** (`RoadmapNode.linkedRoadmapId`) — lets a grade
  roadmap node open a dedicated topic roadmap, with progress read once from the
  shared child roadmap (no sync logic needed since multiple parents point at the same
  child). Needed when grade roadmaps get built; not touched here.
- **Game-style topic entry UI** (avatar walking into/through/out of a topic) — the
  existing dropdown/slide-panel (`NodeLessonsPanel`) stays functional. Visual
  redesign is a later phase.
- **AI-generated quiz variants** (e.g. consonant/number distractors) — future variants
  should stay rule-based/hand-authored (curriculum correctness matters, e.g. isiZulu
  has no /r/ phoneme), with AI reserved for optional flavour text only, not structural
  content. No code built this session.
- **Confidence-threshold marking** — reserved for dynamic quizzes (e.g. general vocab
  quiz) later; roadmap assessment lessons stay fixed-count/fixed-pass% for now.

---

*Last updated: July 2026*

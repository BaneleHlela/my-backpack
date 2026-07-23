# Course/Roadmap Restructure — Design

**Status:** Confirmed, ready to build. Supersedes the current `Field → Subject → Topic → MiniApp` model where a "roadmap" is a `MiniApp` of `type: 'roadmap'` living under a `Topic`.

## The problem

`SubjectHomePage.tsx` calls `fetchRoadmapBySubject(subjectId)` → `GET /api/roadmap/subject/:subjectId` → `Roadmap.findOne({ subjectId })`. `findOne` — singular. The model assumes one roadmap per subject, so clicking a subject drops you into one hardcoded roadmap instead of a list of learning paths. There's also a naming collision: "Topic" currently means two different things — the grouping layer above MiniApps, and (colloquially) the individual steps inside a roadmap.

## The new model

```
Subject
 ├── Course[]   (new model)
 │     ├── roadmapId → Roadmap (1:1, existing model, simplified)
 │     │                 └── nodes[] → RoadmapNode ("Topic" in the UI/dashboard vocabulary)
 │     │                                 └── items[] (Lesson | Quiz — existing, unchanged)
 │     └── miniAppIds[] → MiniApp (optional convenience links, e.g. Dictionary inside an English course)
 └── MiniApp[]  (existing model, reparented — subjectId instead of topicId)
```

`Topic` is removed entirely. It doesn't survive as a model — its two jobs get split cleanly: grouping MiniApps under a Subject is now just `MiniApp.subjectId`, and the "individual step" meaning gets to keep the name, applied to what was already `RoadmapNode`.

**Course** is the new umbrella for a roadmap-based learning path — "Phonics," "Vowels," "IsiZulu HL Grade 1." One Course wraps exactly one Roadmap. A Course can additionally reference existing MiniApps (e.g. Dictionary) as convenience links, shown in a side panel the same way Subject-level MiniApps already are — this doesn't change where Dictionary lives, just adds an optional pointer to it from a relevant Course.

**Roadmap** stops carrying `subjectId`/`miniAppId`. It becomes a pure container of nodes, referenced *from* `Course.roadmapId`. This removes the `findOne`-assumes-one-per-subject problem at the root — fetching a subject's courses is `Course.find({ subjectId })`, a list.

**MiniApp** reparents from `topicId` to `subjectId`, and drops `'roadmap'` from its type enum (no longer needed — Course now owns that job). English Vocabulary's redundant `type: 'quiz'` MiniApp gets deleted; quiz access folds into the Dictionary UI, reusing the same bucket-based dynamic Quiz it already creates.

**RoadmapNode** gets two additions: a `slug` (for clean URLs — it doesn't have one today), and `linkedCourseIds: Course[]` (plural, defaulting to empty) — reserved for the deferred multi-provider-course feature (see below). Nothing else about it changes; it's still what a Lesson/Quiz sequence hangs off of.

## Deferred: multi-provider courses

See `docs/product/course-marketplace-vision.md` for the full picture. The two things this restructure needs to account for *now*, so a later breaking migration isn't needed:

1. `Course.team` — reserved field, no shape/behaviour yet.
2. `RoadmapNode.linkedCourseIds` is an **array** from day one, even though today it's always empty. Later, an overview-level roadmap (e.g. a subject-wide "all of Maths" roadmap, or a certificate/degree roadmap) will use this to let one node point at several competing/interchangeable Courses instead of one fixed roadmap.

## Migration for existing data

Three of today's `MiniApp(type:'roadmap')` documents — Phonics Roadmap, Sounds Roadmap, Number Sense Roadmap — each already own a real `Roadmap` (with real nodes and real learner progress via `ProfileRoadmapProgress`). The migration must **reuse those existing Roadmap `_id`s**, not recreate them, or progress data gets orphaned. Sequence:

1. For each existing `Roadmap` with `subjectId` set, create a `Course` pointing `roadmapId` at that same roadmap (reusing the old Topic/MiniApp's name+slug — `phonics`, `sounds`, `number-sense` — as the Course's name+slug, for continuity with the ongoing seeders described below).
2. Unset `subjectId`/`miniAppId` on that `Roadmap`.
3. Delete the three `MiniApp(type:'roadmap')` documents and the `Quiz` MiniApp under Vocabulary.
4. Delete all `Topic` documents. Reparent the surviving `Dictionary` MiniApp to `subjectId` directly.

Going forward, the three roadmap seeders (`english-phonics.roadmap.seed.ts`, `isizulu-hl.roadmap.seed.ts`, `math-foundation.roadmap.seed.ts`) upsert the **Course** first (by `subjectId` + the same slug used in the migration above), then resolve the Roadmap via `course.roadmapId` if it already exists, or create a new one if not. This keeps the whole thing idempotent and re-runnable, same as every other seeder.

## API changes

- `GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/topics` and `.../topics/:topicSlug/miniapps` are removed.
- New: `GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/courses` (list) and `.../courses/:courseSlug` (detail, with `roadmapId`/`miniAppIds` populated).
- New: `GET /api/content/fields/:fieldSlug/subjects/:subjectSlug/miniapps` and `.../miniapps/:miniAppSlug` (dropped the `:topicSlug` segment).
- `GET /api/roadmap/subject/:subjectId` and `GET /api/roadmap/:miniAppId` are removed (both assumed the old one-per-subject/roadmap-typed-miniapp model). Replaced by `GET /api/roadmap/course/:courseId`.
- Node/lesson/quiz-item routes (`/api/roadmap/node/:nodeId`, `/lesson/:lessonId`, etc.) are unchanged — they already operate on stable ids, not on subject/topic context.

## Frontend changes (detail in the frontend prompt)

`SubjectHomePage` splits in two: the subject page now lists Courses (main content) and Subject-level MiniApps (side panel, same UI pattern as today, just without the Topic grouping label). A new course page renders the roadmap for a selected Course, reusing `RoadmapPath` as-is.

**As implemented (July 2026), differences from the above:**
- `RoadmapPath` (and `NodeLessonsPanel`) gained a `courseSlug` prop — lesson/quiz-item routes now nest under a Course (`/subject/:subjectSlug/course/:courseSlug/lesson/:lessonId`, `.../node/:nodeId/quiz/:itemId`), so it's a small prop addition rather than fully "as-is."
- The course-list endpoint (`GET .../courses`) doesn't populate `miniAppIds` or return per-profile progress — only the roadmap's structural `nodeCount`. `SubjectHomePage`'s course cards show `nodeCount` as a badge, not a completion percentage; per-profile progress (`completedItems`/`totalItems`) only appears on `CoursePage`, once `fetchRoadmapByCourse` resolves. The course-detail endpoint (`GET .../courses/:courseSlug`) *does* populate `miniAppIds`, so `CoursePage`'s quick-links row only renders when the resolved course object came from that endpoint (list-based resolution falls back to it when the courses list isn't in state yet).
- `apps/mobile`'s `contentSlice.ts`/`home.tsx` were also updated in the same pass (flat `fetchSubjectMiniApps` replacing the old per-Topic `fetchStandaloneMiniApps`) since they imported the now-removed `ITopic` shared type and called the removed `/topics` endpoints — mobile still has no Course/roadmap UI, just the flat MiniApps list.
- The "quiz access folds into the Dictionary UI" line (above) described the data-model side only — the `Quiz` MiniApp was deleted and its documents re-pointed at Dictionary's `miniAppId`, but no UI entry point existed yet. Closed out July 2026 (web only): a `/field/:fieldSlug/subject/:subjectSlug/miniapp/:miniAppSlug/quiz` route was added alongside the existing `/bucket` one, `MiniAppPage` routes it to `QuizPage` for the Dictionary `miniApp.type`, and `DictionaryPage` got a "Take Quiz" button. No changes were needed to `QuizPage` itself.

# Content Studio — Design (v1: Course Flow)

**Status:** Ready to build. v1 scope: the full course-authoring flow (Course → Node → Lesson/Quiz → Question) end to end, plus the shared asset library it depends on. Analytics and Platform/Accounts tabs are placeholders only.

## Scope for this pass

Shell with three tabs: **Courses** (fully built), **Analytics** (placeholder), **Platform** (placeholder). No separate "Assets" tab — asset upload/browse is embedded directly in the Question and Lesson editors, wherever a field needs an image/audio/video, since that's the only place it's actually used right now.

## Auth

Still outstanding from earlier planning — nothing exists yet (`grep` for `isPlatformAdmin`/`requirePlatformAdmin` across the whole repo comes back empty). This is Phase 0 of the first backend prompt: `isPlatformAdmin: boolean` on `Profile`, `requirePlatformAdmin` middleware modeled on the existing `requireOwner`, mounted once at the root of a new `/api/dashboard/*` namespace so every mutation this build adds is gated in one place.

**Read vs. write split:** the dashboard frontend reads from the existing public `/api/content/*` endpoints (fields, subjects, courses, miniapps — already built, already public, no reason to duplicate). Only *mutations* (create/edit/delete course, node, lesson, quiz, question; asset upload) go through the new gated `/api/dashboard/*` namespace.

## A real gap this surfaced: `Quiz.miniAppId` / `Question.miniAppId`

Both are `required`, and both predate the Course model — they were designed around "everything hangs off a MiniApp." The Course/Roadmap restructure's migration already solved this once, cleverly: when it wrapped each existing roadmap-type MiniApp in a Course, it gave the **Course the same `_id` as the old MiniApp**, so existing `Quiz.miniAppId`/`Question.miniAppId` references kept resolving without needing a schema change.

Same convention going forward: for any Quiz or Question created for a course's roadmap, set `miniAppId` to that **Course's `_id`**. It's a legacy field name at this point (nothing here is literally a MiniApp), but it's just an ObjectId pointer, so it works, and it means neither model needs to change. A future cleanup could rename the field; not necessary for this build.

## Question authoring: manual entry, not AI-assisted

`docs/content/question-builder.md` describes a richer intended workflow — AI-suggested distractors, one example sentence auto-generating three question variants, auto-generated true/false pairs from a different term's definition. That's real, valuable, and worth keeping in the doc as the longer-term direction, but it conflicts with the established rule that AI (Claude Haiku) is reserved for optional flavour text, not structural content. **v1 is fully manual** — every question, every option, every distractor is typed in directly by whoever's authoring it. The "smart generation" features in that doc are a clearly-flagged future enhancement, not built now.

## Question types: form archetypes, not 21 separate forms

The 21 `QuestionType` values collapse into five actual form shapes:

| Archetype | Types | Fields |
|---|---|---|
| MCQ | `mcq_term_to_def`, `mcq_def_to_term`, `mcq_correct_usage`, `mcq_incorrect_usage`, `mcq_fill_blank`, `mcq_audio` | prompt, promptAudioUrl, options[], correctAnswer, explanation |
| True/False | `true_false_term_def`, `true_false_def_term`, `true_false_usage` | prompt, promptAudioUrl, correctAnswer ('true'/'false'), explanation |
| Text input | `fill_blank_typed`, `text_input_def`, `text_input_audio`, `text_input_example` | prompt, promptAudioUrl, correctAnswer, explanation |
| DnD (basic) | `dnd_single`, `dnd_select`, `dnd_count`, `dnd_sort`, `dnd_sequence`, `dnd_match` | prompt, promptAudioUrl, draggables[], dropZones[], dragAreaImageUrl, feedback |
| DnD (fill/build) | `dnd_fill`, `dnd_build` | prompt, promptAudioUrl, draggables[], dropZones[], sentenceTemplate, blanks[], dragAreaImageUrl, feedback |

`prompt` + optional `promptAudioUrl` are universal across every archetype (DnD included) and edited
from one Prompt section at the top of the question form regardless of type — `promptAudioUrl` is a
GCS *path* (not a full URL, see below) for audio played alongside the plain display text in
`prompt`. This is additive: `mcq_audio`'s old `audio:`-prefix-on-`prompt` convention (audio-only,
no simultaneous text) still works as-is for content seeded before `promptAudioUrl` existed, but new
questions of every type — including `mcq_audio` — use plain `prompt` text plus optional
`promptAudioUrl` instead. `content.avatar` remains on the schema (rendered as-authored for existing
questions) but is no longer editable from the question form — a v1 form-simplification, not a
data-model change.

v1 covers 16 of the 21 (matches the earlier scoping decision): the 13 with a frontend renderer, plus `mcq_audio`/`dnd_build`/`dnd_count` (already used in real seed content). The remaining 5 `dnd_*` types are a config-table addition later, not a rebuild — the archetype system is built so adding them is additive.

## Asset library

New GCS root, separate from the existing curated tree (`illustrations/`, `sounds/`, `content/`, etc. stay exactly as they are): `question-media/{images|audio|video|documents}/`. Anything uploaded through the dashboard — while authoring a question or a lesson resource — lands here, and can be browsed/reused from any other question/lesson editor afterward.

**Important convention, matches how the rest of the app already works:** `IDraggable.imageUrl`, `IDraggable.audioUrl`, `IFeedback.audioUrl`, etc. all store a **GCS path** (e.g. `question-media/images/172xxxx-cat.png`), not a full URL. The asset upload endpoint returns both `path` and `url`; the form stores `path`, and the frontend builds the display URL the same way everything else does (`ASSETS.GCS_BASE + '/' + path`).

No separate MongoDB collection to track uploaded assets — GCS itself is the source of truth (`bucket.getFiles({ prefix })` for browsing), rather than maintaining a second index that has to stay in sync with what's actually in the bucket.

## Data flow, end to end

```
Course (subjectId, name, slug, roadmapId, miniAppIds[], team, curriculumTags)
  └── Roadmap.nodes[] → RoadmapNode ("Topic" in the UI)
        └── items[] → { itemType: 'lesson', itemId } → Lesson (resources[])
                     → { itemType: 'quiz', itemId }   → Quiz (mode: 'fixed', miniAppId: <course._id>, questionIds[])
                                                            └── Question[] (miniAppId: <course._id>, type, content)
```

Creating a Course also creates its (empty) Roadmap in the same request. Deleting anything at any level is a **soft delete** (`isActive: false`) — not a hard delete — since real learner progress can already be attached to nodes/lessons/quizzes by the time someone edits them.

## Frontend implementation notes (divergences from the original build plan)

The frontend build prompt assumed a few things that turned out not to match the actual repo
state, or ran into gaps this pass had to route around rather than expand the backend for:

- **No `apps/web/src/components/ui` kit exists.** The app's glassmorphism look (e.g.
  `SubjectCard.tsx`, `EnrollmentModal.tsx`) is direct Tailwind utility classes at each call site,
  not an imported shared component library. Content Studio follows the same convention —
  `Modal.tsx` and every studio page/component use the same `bg-white/NN backdrop-blur-sm
  rounded-2xl/3xl border border-white/NN` pattern directly, rather than importing a kit that
  doesn't exist.
- **`IProfile` (in `packages/shared/types/profile.ts`) was missing `isPlatformAdmin`.** The
  backend `Profile` model and `IProfileDocument` had it; the frontend-facing mirror type didn't.
  Added it — `StudioLayout`'s gate reads `activeProfile.isPlatformAdmin` off this type.
- **No "all courses across all subjects" read endpoint.** `CoursesListPage` aggregates
  client-side: `GET /content/fields` → per field `.../subjects` → per subject `.../courses`,
  cached in `studioSlice.allCourses`. Small dataset today (2 fields, a handful of subjects), so
  the fan-out is cheap; worth a dedicated dashboard aggregation endpoint if the catalog grows.
- **No dashboard GET for a single Question by id.** Rather than add a new `/api/dashboard/*` read,
  the question editor's edit mode reuses `GET /api/dashboard/questions?courseId=`, found by id
  client-side. This is why every studio question-editor link carries `?courseId=` as a query param
  even when editing, not just when creating. (A single-Quiz equivalent, `GET
  /api/dashboard/quizzes/:quizId`, *was* added — the original plan's client-side-find over
  `GET /api/quiz/quizzes?miniAppId=<courseId>` produced a silent blank `QuizEditorPage` whenever
  that lookup failed, with no way to distinguish "still loading" from "failed to load"; the direct
  `Quiz.findById` route plus `QuizEditorPage` now rendering `error` state fixed both.)
- **No item-reorder endpoint on a `RoadmapNode`.** Only node-reorder
  (`.../courses/:courseId/nodes/reorder`) and quiz-question-reorder
  (`.../quizzes/:quizId/questions`) exist — a node's own `items[]` (its Lessons/Quizzes) has no
  equivalent, so `NodeDetailPage` lists items in their created order with no drag handle. Authored
  item order is fixed at creation time for v1.
- **v1 question editor exposes exactly the 16 types** from the archetype table above (12
  text-based + `dnd_single` + `mcq_audio` + `dnd_build` + `dnd_count`) via a dropdown grouped by
  archetype (`questionArchetypes.ts`). The other 5 (`dnd_select`, `dnd_sort`, `dnd_sequence`,
  `dnd_match`, `dnd_fill`) aren't offered — adding them later is a config-table entry, not a form
  rebuild, per the "5 archetypes, not 21 forms" design above.
- Drag-to-reorder (node list, node items — n/a per above, quiz question list, lesson resources
  list) uses `@dnd-kit/core` + `@dnd-kit/sortable`, already a dependency (used by
  `DndSinglePattern` for the learner-facing DnD quiz renderer), via a shared
  `SortableList`/`DragHandle` component rather than a new drag library.

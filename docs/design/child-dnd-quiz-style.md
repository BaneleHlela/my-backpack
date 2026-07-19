# Child-Mode Styling for DnD Quiz + Shared Quiz Chrome

## Problem

`DndSinglePattern.tsx` and the shared quiz chrome around it (`QuizProgress.tsx`,
`AnswerFeedback.tsx`, and the host pages `QuizPage.tsx` / `QuizItemPlayerPage.tsx`)
rendered one visual treatment regardless of who was using it. In practice the two
host pages skew toward different age groups:

- `QuizItemPlayerPage.tsx` is reached from Foundation Phase roadmaps (isiZulu/English
  vowels, CVC words, math counting) — overwhelmingly `ageGroup: 'child'`.
- `QuizPage.tsx` is the vocab mini-app quiz — skews `ageGroup: 'adult'`/`'teen'`.

Both pages render the same shared components (`QuestionRenderer`, `QuizProgress`,
`AnswerFeedback`), so child-mode styling is added as an `ageGroup` branch inside
these shared components rather than as a fork/duplicate of them.

The pages also had no height constraint — a `dnd_single` question with 5 draggables
plus a prompt row plus feedback could overflow the viewport and force scrolling,
which is a poor experience for a young child using a phone.

## Layout Contract (both age groups)

The active-question view (question + skip button + inline feedback) is
viewport-locked, never scrolls:

- Outer page shell: `h-[100dvh] overflow-hidden flex flex-col` (`100dvh`, not
  `100vh`, so mobile browser chrome — the address bar showing/hiding — doesn't
  cause layout jumps or clip content).
- Back button + `QuizProgress` sit in a `flex-shrink-0` top region.
- The active-question region is `flex-1 min-h-0 flex flex-col overflow-hidden` —
  it must never need to scroll. Components inside it (`QuestionRenderer` and, for
  DnD, the pool/drop-zone/submit stack) use `flex-1`/`min-h-0` themselves to
  consume available space rather than push content off-screen.
- The existing `max-w-2xl mx-auto` horizontal constraint is preserved on larger
  (web/tablet) viewports — only the height behavior is new.
- `QuizStartScreen`, `QuizResults`, and loading/error states keep their current
  scrollable-if-needed treatment. This contract is specific to the active-question
  view, where content height is the least predictable (escalating draggable
  counts, variable prompt length).

This shell is shared via `QuizPageShell` (`apps/web/src/components/quiz/`) so the
layout logic isn't duplicated between `QuizPage.tsx` and `QuizItemPlayerPage.tsx`.

## Color/Spacing — Child Mode

Applies when `ageGroup === 'child'`, scoped to `DndSinglePattern`, `QuizProgress`,
and `AnswerFeedback`:

- **DnD prompt row** — large glass speech bubble (`~82%` width, `bg-white/50
  backdrop-blur border border-white/70 rounded-[28px]`, centered semibold text)
  with the avatar inline at the left when `content.avatar` is set, sitting beside
  a vertical stack of two icon buttons (Replay above Hint, `56–64px` square,
  `rounded-3xl`, `active:scale-95` for touch feedback). This row is
  `flex-shrink-0` so it can never eat into the drop zone's space.
- **Draggable tiles** — `rounded-2xl border-[3px] border-violet-200 bg-white`,
  sized with `clamp(56px, 18vw, 76px)` so tiles shrink gracefully as draggable
  count escalates (1 → 2 → 5 across the vowels quiz variants) instead of
  overflowing at the high end.
- **Drop zone** — `flex-1 min-h-0 rounded-3xl border-[3px] border-dashed
  border-violet-200 bg-white/40`, no fixed `min-h` — it consumes whatever space
  remains after the prompt row, tiles, and submit button.
- **Submit button** (non-`autoSubmit` only) — `flex-shrink-0`, full-width,
  `rounded-2xl bg-violet-500 text-white py-3.5 text-base font-semibold`, pinned
  to the bottom of the flex column (not `position: fixed`).
- **`QuizProgress`** — thicker bar (`h-3` vs `h-1.5`) and slightly larger label
  text; same violet→teal gradient fill and "Question N of M" copy. No star icons
  or mascots here — the DnD pattern carries the playful weight.
- **`AnswerFeedback`** — larger avatar (`w-20 h-20` vs `w-16 h-16`), larger
  headline text, bigger single CTA button. Same modal structure (centered card
  over a dimmed backdrop, no click-outside-dismiss).
- Colors stay inside the existing palette — violet primary, amber for
  replay/hint, rose for wrong attempts, emerald for correct. No new gradient
  background was introduced.

**Adult/teen mode is visually unchanged.** The existing markup and classes are
kept as the default branch; only structural changes required to fit inside the
new `flex-1 min-h-0` shell were made (no visual difference).

## Docs

This doc is linked from `CLAUDE.md`'s Frontend Web progress section.

---

*Last updated: July 2026*

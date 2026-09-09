# Mobile question layout and submission checks

The quiz screen uses flat, theme-aware controls, not DepthButton/DepthView. The
header, mode/progress rows, and Submit/Skip footer stay outside the question scroll
area. A `flex: 1` / `minHeight: 0` chain bounds that viewport to the remaining screen
height. Its content uses `flexGrow: 1`, so long prompts, choices, and drag-and-drop
pools grow and scroll instead of being clipped. Feedback has its own bounded scroll
area with a persistent Next/Finish button.

`QuestionScrollArea` is keyed by session and question ID, keeping the selected answer
through submitting, feedback, and recoverable failures, while resetting on the next
question. Tile pans block the surrounding native scroll gesture. Drop-zone bounds
are refreshed when a drag starts, since scrolling changes window coordinates without
necessarily triggering `onLayout`.

An empty manual submit is ignored locally. An explicit Skip sends an empty response
with `wasSkipped: true`; the API validates the request and the AnswerRecord schema
permits empty skipped/timed-out records. Ordinary answers still require nonblank
text. Submission failures return to the same active question with an inline retry
message, and the thunk guards against double taps and stale responses. Auto-submit
DnD answers can also be retried from the footer.

The skip fix includes an API change: deploy the backend change as well as updating
the mobile code. No data migration is needed.

## Automated checks

From the repository root after installing dependencies:

```sh
pnpm test
pnpm --filter @my-backpack/mobile exec tsc --noEmit
pnpm --filter @my-backpack/api exec tsc --noEmit
pnpm --filter @my-backpack/mobile exec expo export --platform android --no-bytecode
```

The export above is a JavaScript bundle smoke test, not an installable APK or a
device test. It does not deploy an update.

## Device QA checklist

- On a small Android screen and in landscape, scroll a long prompt and every answer
  choice. Confirm the header/progress and Submit/Skip controls remain reachable.
- Test both themes and enlarged system text. No question or feedback text should
  be truncated horizontally or hidden below a fixed-height control.
- Type an answer with the keyboard open. Confirm the field and submission controls
  remain reachable, and blank/whitespace input cannot submit.
- Skip an unanswered question. Check zero points, skipped feedback, and normal
  progression to the next question or final results.
- Scroll before dragging in single/build/count questions. Check the current target
  positions, cancellation/snap-back, hints, auto-submit, and manual counting.
- Disable networking during submission, then reconnect and retry. The answer and
  quiz progress should remain intact, including auto-submit DnD questions.
- Advance between questions of the same type (including identical prompt text):
  answer state, scroll position, and hints should reset only for the new question.
- Open long answer feedback on a small screen. Scroll the explanation while the
  Next/Finish button remains visible.

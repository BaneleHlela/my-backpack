// Shared contract between QuestionRenderer/QuizSessionScreen and every interaction pattern
// (McqPattern, TrueFalsePattern, TypedInputPattern, DndSinglePattern, DndBuildPattern,
// DndCountPattern). The Submit/Skip controls used to live inside each pattern; they're now a
// single global bottom bar owned by QuizSessionScreen (see its module comment), so a pattern no
// longer decides for itself when it's submittable — it just reports that upward:
//   - `onReadyChange(ready)` fires whenever the pattern's local "is there a submittable answer
//     right now" state changes (selecting an MCQ option, typing non-empty text, filling every
//     DnD blank, ...). The global Submit button's disabled state is driven directly by this.
//   - `submit()` (exposed via ref) is what the global Submit button calls to actually trigger
//     the pattern's existing internal submit logic (still owns its own onAnswer(rawResponse)
//     call and shape).
// Auto-submit DnD patterns still call onAnswer on their landing/fill event. Once filled they
// also report readiness, so the footer can retry that answer if the request fails. The screen
// and thunk guard against duplicate requests while an answer is being submitted.
export interface QuestionPatternHandle {
  submit: () => void;
}

export interface QuestionPatternReadyProps {
  onReadyChange?: (ready: boolean) => void;
}

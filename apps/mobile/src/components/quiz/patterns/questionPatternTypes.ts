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
// Patterns whose questions can never be manually submitted (autoSubmit dnd_single/dnd_build,
// which call onAnswer themselves the instant their one landing moment happens) simply never
// report ready:true — the global Submit button stays disabled for the whole question, which is
// the "always visible but disabled when not used" behavior QuizSessionScreen wants.
export interface QuestionPatternHandle {
  submit: () => void;
}

export interface QuestionPatternReadyProps {
  onReadyChange?: (ready: boolean) => void;
}

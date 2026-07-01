// API-side type definitions for questions, DnD content, helpers, and node assignments.
// Mirrors packages/shared/types/question.ts — keep in sync.

// ── Shared sub-types ─────────────────────────────────────

export interface IDraggable {
  id: string;                // unique within this question
  label: string;             // text shown on/under item e.g. "cat", "4", "A"
  imageUrl?: string;         // GCS path to image asset
  audioUrl?: string;         // GCS path — audio played when item is tapped
  quantity?: number;         // for dnd_count — how many copies exist in pool
}

export interface IDropZone {
  id: string;
  label?: string;            // e.g. "Animals", "Fruits", blank for single zone
  imageUrl?: string;         // optional background image for the zone
  requiredDraggableIds: string[];  // which draggable ids belong in this zone
  requiredCount?: number;    // for dnd_count — exact count needed
}

export interface IBlank {
  position: number;          // index in the sentence template
  correctDraggableId: string;
}

export interface IFeedback {
  text?: string;             // e.g. "Well done! That IS a cat!"
  audioUrl?: string;         // GCS path
  highlightWords?: string[]; // ["I", "AM", "A", "CAT"] word-by-word highlight
}

export interface IAvatarConfig {
  avatarId: string;
  dialogue: string;          // what the avatar says in text
  dialogueAudioUrl?: string; // GCS path to voiced dialogue
  emotion: 'happy' | 'thinking' | 'excited' | 'encouraging';
}

// ── Helpers ──────────────────────────────────────────────

export interface IQuestionHelpers {
  // Audio helpers
  autoReadPrompt: boolean;      // reads question prompt aloud on load
  autoReadOptions: boolean;     // reads each option label on hover/tap
  countingAudio: boolean;       // counts aloud as items drop into zone (dnd_count)
  successAudioImmediate: boolean; // plays success audio the moment correct answer achieved

  // Visual helpers
  highlightCorrectZone: boolean; // correct drop zone glows to guide child
  showItemLabels: boolean;       // shows text label beneath each draggable item
  animateHint: boolean;          // draggable bounces toward correct zone after hintDelaySeconds

  // Interaction helpers
  autoSubmit: boolean;           // true: success fires on correct drop; false: needs Submit button
  allowUndo: boolean;            // child can drag item back out of drop zone
  hintsAllowed: number;          // 0 = none
  hintDelaySeconds: number;      // 0 = never auto-offer
  retryUntilCorrect: boolean;    // DnD: wrong drops are rejected client-side and must be retried —
                                 // never submitted to the server; no skip is offered while true
}

export const defaultHelpers: IQuestionHelpers = {
  autoReadPrompt: true,
  autoReadOptions: true,
  countingAudio: true,
  successAudioImmediate: true,
  highlightCorrectZone: false,
  showItemLabels: true,
  animateHint: false,
  autoSubmit: true,
  allowUndo: true,
  hintsAllowed: 3,
  hintDelaySeconds: 10,
  retryUntilCorrect: false,
};

// ── Unified content type ──────────────────────────────────

export interface IQuestionContent {
  // Text question fields (used by all non-DnD types)
  prompt?: string;           // for mcq_audio: starts with "audio:" prefix
  options?: string[];        // for MCQ and true_false types
  correctAnswer?: string;
  explanation?: string;

  // DnD fields (used by dnd_* types)
  draggables?: IDraggable[];
  dropZones?: IDropZone[];

  // For dnd_fill and dnd_build
  sentenceTemplate?: string; // e.g. "The ___ sat on the ___"
  blanks?: IBlank[];

  // Feedback (used by DnD types, optional for text types)
  successFeedback?: IFeedback;
  tryAgainFeedback?: IFeedback;

  // Avatar (optional on any question type)
  avatar?: IAvatarConfig;

  // Default helpers for this question (node assignments can override)
  defaultHelpers?: Partial<IQuestionHelpers>;
}

// ── Node helper override ──────────────────────────────────

// Stored on RoadmapNode.assessment.questionAssignments, not on Question itself.
// Node override wins over question.content.defaultHelpers on conflict.
export interface INodeQuestionAssignment {
  questionId: string;
  order: number;             // display order within the node
  helperOverrides?: Partial<IQuestionHelpers>;
}

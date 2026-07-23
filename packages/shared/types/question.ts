// Shared types for questions, DnD content, helpers, and node assignments.
// Used by both frontend apps and the API (via packages/shared).

export type QuestionType =
  | 'mcq_term_to_def'
  | 'mcq_def_to_term'
  | 'mcq_correct_usage'
  | 'mcq_incorrect_usage'
  | 'mcq_fill_blank'
  | 'fill_blank_typed'
  | 'true_false_term_def'
  | 'true_false_def_term'
  | 'true_false_usage'
  | 'text_input_def'
  | 'text_input_audio'
  | 'text_input_example'
  | 'mcq_audio'
  | 'dnd_single'
  | 'dnd_select'
  | 'dnd_count'
  | 'dnd_sort'
  | 'dnd_sequence'
  | 'dnd_match'
  | 'dnd_fill'
  | 'dnd_build';

export type QuestionSource = 'auto' | 'ai' | 'manual';

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
  avatarEmotion?: string;    // which emotion content.avatar's character should show
                              // when this feedback fires (same avatarId, different expression)
}

export interface IAvatarConfig {
  avatarId: string;
  dialogue: string;          // what the avatar says in text
  dialogueAudioUrl?: string; // GCS path to voiced dialogue
  // TODO: celebrating documented but not implemented, see avatar-guide.md
  emotion: 'happy' | 'thinking' | 'excited' | 'encouraging' | 'sad' | 'serious' | 'smiling';
}

// ── Helpers ──────────────────────────────────────────────

export interface IQuestionHelpers {
  autoReadPrompt: boolean;
  autoReadOptions: boolean;
  countingAudio: boolean;
  successAudioImmediate: boolean;
  highlightCorrectZone: boolean;
  showItemLabels: boolean;
  animateHint: boolean;
  autoSubmit: boolean;
  allowUndo: boolean;
  hintsAllowed: number;
  hintDelaySeconds: number;
  retryUntilCorrect: boolean; // DnD: wrong drops are rejected client-side and must be retried —
                              // never submitted to the server; no skip is offered while true
  shuffleDraggables: boolean; // DnD: randomize the draggable pool's display order once per
                              // question load, instead of the authored content.draggables order
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
  shuffleDraggables: false,
};

// ── Unified content type ──────────────────────────────────

export interface IQuestionContent {
  // Text question fields (used by all non-DnD types)
  prompt?: string;           // for mcq_audio: starts with "audio:" prefix (legacy convention,
                              // kept as-is for old seeded content — audio-only, no simultaneous text)
  promptAudioUrl?: string;   // GCS path — optional audio to play alongside plain display text in
                              // `prompt`, additive to the legacy `audio:` prefix convention above
  options?: string[];        // for MCQ and true_false types
  correctAnswer?: string;
  explanation?: string;

  // DnD fields (used by dnd_* types)
  draggables?: IDraggable[];
  dropZones?: IDropZone[];
  dragAreaImageUrl?: string; // background covering the entire drag-and-drop widget
                             // (draggable tray + drop zone) — distinct from
                             // IDropZone.imageUrl, which only backgrounds one zone

  // For dnd_fill and dnd_build
  sentenceTemplate?: string; // e.g. "The ___ sat on the ___"
  blanks?: IBlank[];

  // Feedback (used by DnD types, optional for text types)
  successFeedback?: IFeedback;
  tryAgainFeedback?: IFeedback;

  // Avatar (optional on any question type)
  avatar?: IAvatarConfig;

  // Default helpers for this question
  defaultHelpers?: Partial<IQuestionHelpers>;
}

// ── Node helper override ──────────────────────────────────

// Stored on RoadmapNode.assessment.questionAssignments, not on Question itself
export interface INodeQuestionAssignment {
  questionId: string;
  order: number;             // display order within the node
  helperOverrides?: Partial<IQuestionHelpers>;
}

// ── Main question interface ───────────────────────────────

export interface IQuestion {
  _id: string;
  termId?: string;
  definitionId?: string;
  nodeId?: string;
  miniAppId: string;
  type: QuestionType;
  content: IQuestionContent;
  maxPoints: number;
  pointsCanBePartial: boolean;
  source: QuestionSource;
  isGeneric: boolean;
  profileId?: string | null;
  isActive: boolean;
  // Idempotent upsert key used only by seed scripts — not used in application logic.
  seedKey?: string;
  createdAt: string;
  updatedAt: string;
}

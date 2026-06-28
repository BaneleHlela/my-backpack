// A practice question linked to a vocabulary term+definition pair or a roadmap node.
// Questions are shared across all users — generated once (auto, AI, or manually) and reused.
//
// All question data lives in the unified `content` field (IQuestionContent).
// TypeScript types in modules/question/question.types.ts provide the safety layer.
//
// Question types and default max points:
//   mcq_term_to_def: 4     — show term, select correct definition
//   mcq_def_to_term: 4     — show definition, select correct term
//   mcq_correct_usage: 5   — select sentence using word correctly
//   mcq_incorrect_usage: 7 — select sentence using word incorrectly (harder)
//   mcq_fill_blank: 4      — sentence with blank, select correct word
//   fill_blank_typed: 6    — sentence with blank, user types exact word
//   true_false_term_def: 2 — term + definition shown, is it a match?
//   true_false_def_term: 2 — definition + term shown, is it a match?
//   true_false_usage: 3    — sentence shown, is the word used correctly?
//   text_input_def: 5      — shown definition, type the term
//   text_input_audio: 5    — hear audio, type the term
//   text_input_example: 5  — example sentence with word removed, type the term
//   mcq_audio: 4           — prompt is an audio file path, user selects from options
//   dnd_single: 4          — drag one item to one zone
//   dnd_select: 4          — drag correct item from multiple options to one zone
//   dnd_count: 4           — drag a specific quantity of items to a zone
//   dnd_sort: 5            — sort items into multiple category zones
//   dnd_sequence: 5        — arrange items in correct order
//   dnd_match: 5           — match pairs across two columns
//   dnd_fill: 5            — drag words into sentence blanks
//   dnd_build: 5           — drag letters or syllables to build a word
import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { IQuestionContent } from '../../../../modules/question/question.types';

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

export const DEFAULT_MAX_POINTS: Record<QuestionType, number> = {
  mcq_term_to_def: 4,
  mcq_def_to_term: 4,
  mcq_correct_usage: 5,
  mcq_incorrect_usage: 7,
  mcq_fill_blank: 4,
  fill_blank_typed: 6,
  true_false_term_def: 2,
  true_false_def_term: 2,
  true_false_usage: 3,
  text_input_def: 5,
  text_input_audio: 5,
  text_input_example: 5,
  mcq_audio: 4,
  dnd_single: 4,
  dnd_select: 4,
  dnd_count: 4,
  dnd_sort: 5,
  dnd_sequence: 5,
  dnd_match: 5,
  dnd_fill: 5,
  dnd_build: 5,
};

export interface IQuestionDocument extends Document {
  _id: Types.ObjectId;
  termId?: Types.ObjectId;
  definitionId?: Types.ObjectId;
  nodeId?: Types.ObjectId;
  miniAppId: Types.ObjectId;
  type: QuestionType;
  content: IQuestionContent;
  maxPoints: number;
  pointsCanBePartial: boolean;
  source: QuestionSource;
  isGeneric: boolean;
  profileId: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DND_TYPES = new Set<QuestionType>([
  'dnd_single', 'dnd_select', 'dnd_count', 'dnd_sort',
  'dnd_sequence', 'dnd_match', 'dnd_fill', 'dnd_build',
]);

const questionSchema = new Schema<IQuestionDocument>(
  {
    termId: { type: Schema.Types.ObjectId, ref: 'Term' },
    definitionId: { type: Schema.Types.ObjectId, ref: 'Definition' },
    nodeId: { type: Schema.Types.ObjectId, ref: 'RoadmapNode', index: true },
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp', required: true },
    type: {
      type: String,
      enum: [
        'mcq_term_to_def', 'mcq_def_to_term', 'mcq_correct_usage', 'mcq_incorrect_usage',
        'mcq_fill_blank', 'fill_blank_typed', 'true_false_term_def', 'true_false_def_term',
        'true_false_usage', 'text_input_def', 'text_input_audio', 'text_input_example',
        'mcq_audio',
        'dnd_single', 'dnd_select', 'dnd_count', 'dnd_sort',
        'dnd_sequence', 'dnd_match', 'dnd_fill', 'dnd_build',
      ],
      required: true,
    },
    // Shape varies significantly by question type — TypeScript layer provides safety.
    content: { type: Schema.Types.Mixed, required: true, default: {} },
    maxPoints: { type: Number, required: true },
    pointsCanBePartial: { type: Boolean, default: false },
    source: { type: String, enum: ['auto', 'ai', 'manual'], required: true },
    isGeneric: { type: Boolean, required: true, default: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

questionSchema.pre('validate', function () {
  const self = this as IQuestionDocument;
  const isDnD = DND_TYPES.has(self.type);
  const c = self.content as IQuestionContent | undefined;

  if (isDnD) {
    if (!c?.draggables?.length) {
      throw new Error('DnD questions require content.draggables');
    }
    if (!c?.dropZones?.length) {
      throw new Error('DnD questions require content.dropZones');
    }
    if ((self.type === 'dnd_fill' || self.type === 'dnd_build') && !c?.sentenceTemplate) {
      throw new Error('dnd_fill and dnd_build require content.sentenceTemplate');
    }
  } else {
    if (!c?.prompt) {
      throw new Error('Non-DnD questions require content.prompt');
    }
  }
});

questionSchema.index({ termId: 1, definitionId: 1, type: 1 });
questionSchema.index({ miniAppId: 1, isActive: 1 });
questionSchema.index({ isGeneric: 1 });

const Question: Model<IQuestionDocument> = mongoose.model<IQuestionDocument>(
  'Question',
  questionSchema
);

export default Question;

// A practice question linked to a vocabulary term. Questions are shared across all users —
// generated once (automatically, by AI, or manually) and served to every profile that
// studies the same term.
//
// Question types and their default max points:
//   mcq: 4        — multiple choice, one correct answer
//   word_to_def: 3 — show word, user picks/writes the definition
//   def_to_word: 3 — show definition, user writes/picks the word
//   fill_blank: 5  — sentence with the word removed
//   true_false: 2  — statement about the word, true or false
//   voice: 5       — user speaks the answer (transcribed and graded later)
//   text_input: 4  — user types a free text answer
//
// Partial credit (pointsCanBePartial) is enabled only for open-ended types: voice, text_input.
// For those types, isCorrect = true if pointsAwarded >= maxPoints * 0.5.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type QuestionType =
  | 'mcq'
  | 'word_to_def'
  | 'def_to_word'
  | 'fill_blank'
  | 'true_false'
  | 'voice'
  | 'text_input';

export type QuestionSource = 'auto' | 'ai' | 'manual';

export const DEFAULT_MAX_POINTS: Record<QuestionType, number> = {
  mcq: 4,
  word_to_def: 3,
  def_to_word: 3,
  fill_blank: 5,
  true_false: 2,
  voice: 5,
  text_input: 4,
};

export interface IQuestionDocument extends Document {
  _id: Types.ObjectId;
  termId: Types.ObjectId;
  miniAppId: Types.ObjectId;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  maxPoints: number;
  pointsCanBePartial: boolean;
  source: QuestionSource;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestionDocument>(
  {
    termId: { type: Schema.Types.ObjectId, ref: 'Term', required: true },
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp', required: true },
    type: {
      type: String,
      enum: ['mcq', 'word_to_def', 'def_to_word', 'fill_blank', 'true_false', 'voice', 'text_input'],
      required: true,
    },
    prompt: { type: String, required: true },
    options: { type: [String] },
    correctAnswer: { type: String, required: true },
    explanation: { type: String },
    maxPoints: { type: Number, required: true },
    pointsCanBePartial: { type: Boolean, default: false },
    source: { type: String, enum: ['auto', 'ai', 'manual'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

questionSchema.index({ termId: 1, type: 1 });
questionSchema.index({ miniAppId: 1, isActive: 1 });

const Question: Model<IQuestionDocument> = mongoose.model<IQuestionDocument>(
  'Question',
  questionSchema
);

export default Question;

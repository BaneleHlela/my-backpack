// Raw capture of every single answer a profile submits during a quiz session.
// This is the source of truth for the adaptive algorithm, spaced-repetition scheduling,
// and all future analytics. Never deleted — even if a session is abandoned.
//
// Grading methods:
//   exact_match  — rawResponse compared directly to correctAnswer (mcq, true_false, def_to_word)
//   keyword_match — answer must contain key words (fill_blank)
//   ai_graded    — scored by an AI call after submission (text_input when upgraded)
//   pending      — voice responses waiting for transcription before scoring can happen
//
// For questions with pointsCanBePartial (voice, text_input):
//   isCorrect = true if pointsAwarded >= maxPoints * 0.5
// For all other types:
//   isCorrect = true only if pointsAwarded === maxPoints
//
// confidenceBefore / confidenceAfter snapshot the term's confidence score around this answer
// so the effect of each answer can be replayed or audited later.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ResponseType = 'mcq_selection' | 'text_input' | 'voice_transcript' | 'true_false';
export type GradingMethod = 'exact_match' | 'keyword_match' | 'ai_graded' | 'pending';

export interface IAnswerRecordDocument extends Document {
  _id: Types.ObjectId;
  profileId: Types.ObjectId;
  questionId: Types.ObjectId;
  termId: Types.ObjectId;
  miniAppId: Types.ObjectId;
  sessionId: Types.ObjectId;
  responseType: ResponseType;
  rawResponse: string;
  selectedOptionIndex?: number;
  maxPoints: number;
  pointsAwarded: number;
  isCorrect: boolean;
  gradingMethod: GradingMethod;
  answeredAt: Date;
  timeToAnswerMs: number;
  wasTimedOut: boolean;
  attemptNumber: number;
  wasSkipped: boolean;
  confidenceBefore: number;
  confidenceAfter: number;
  createdAt: Date;
  updatedAt: Date;
}

const answerRecordSchema = new Schema<IAnswerRecordDocument>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    termId: { type: Schema.Types.ObjectId, ref: 'Term', required: true },
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'QuizSession', required: true },
    responseType: {
      type: String,
      enum: ['mcq_selection', 'text_input', 'voice_transcript', 'true_false'],
      required: true,
    },
    rawResponse: { type: String, required: true },
    selectedOptionIndex: { type: Number },
    maxPoints: { type: Number, required: true },
    pointsAwarded: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    gradingMethod: {
      type: String,
      enum: ['exact_match', 'keyword_match', 'ai_graded', 'pending'],
      required: true,
    },
    answeredAt: { type: Date, required: true, default: Date.now },
    timeToAnswerMs: { type: Number, required: true },
    wasTimedOut: { type: Boolean, default: false },
    attemptNumber: { type: Number, default: 1 },
    wasSkipped: { type: Boolean, default: false },
    confidenceBefore: { type: Number, required: true },
    confidenceAfter: { type: Number, required: true },
  },
  { timestamps: true }
);

answerRecordSchema.index({ profileId: 1, termId: 1 });
answerRecordSchema.index({ profileId: 1, sessionId: 1 });
answerRecordSchema.index({ profileId: 1, answeredAt: -1 });
answerRecordSchema.index({ questionId: 1 });

const AnswerRecord: Model<IAnswerRecordDocument> = mongoose.model<IAnswerRecordDocument>(
  'AnswerRecord',
  answerRecordSchema
);

export default AnswerRecord;

// A vocabulary word. Terms are shared across all users and profiles — a word is created once
// (when first searched via the dictionary API) and reused by everyone who adds it to their bucket.
// Definitions are stored separately in definition.model.ts so one word can have multiple meanings.
// The 'word' field is stored lowercase and trimmed to keep lookups consistent.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type TermSource = 'dictionary_api' | 'manual';

export interface ITermDocument extends Document {
  _id: Types.ObjectId;
  word: string;
  miniAppId: Types.ObjectId;
  phonetic?: string;
  origin?: string;
  audioUrl?: string;
  source: TermSource;
  createdAt: Date;
  updatedAt: Date;
}

const termSchema = new Schema<ITermDocument>(
  {
    word: { type: String, required: true, unique: true, trim: true, lowercase: true },
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp', required: true },
    phonetic: { type: String },
    origin: { type: String },
    audioUrl: { type: String },
    source: {
      type: String,
      enum: ['dictionary_api', 'manual'],
      default: 'dictionary_api',
    },
  },
  { timestamps: true }
);

termSchema.index({ miniAppId: 1, word: 1 });

const Term: Model<ITermDocument> = mongoose.model<ITermDocument>('Term', termSchema);

export default Term;

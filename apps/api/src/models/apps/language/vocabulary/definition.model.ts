// One definition record for a vocabulary term. A single word can have many definitions across
// different parts of speech (e.g. "run" as a noun vs a verb). Definitions are shared across
// all users — stored once per term and served to everyone.
//
// The 'order' field preserves the display ordering from the source API so definitions are
// always shown most-important-first.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IDefinitionDocument extends Document {
  _id: Types.ObjectId;
  termId: Types.ObjectId;
  partOfSpeech: string;
  definition: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const definitionSchema = new Schema<IDefinitionDocument>(
  {
    termId: { type: Schema.Types.ObjectId, ref: 'Term', required: true },
    partOfSpeech: { type: String, required: true, trim: true },
    definition: { type: String, required: true },
    examples: { type: [String], default: [] },
    synonyms: { type: [String], default: [] },
    antonyms: { type: [String], default: [] },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

definitionSchema.index({ termId: 1, order: 1 });

const Definition: Model<IDefinitionDocument> = mongoose.model<IDefinitionDocument>(
  'Definition',
  definitionSchema
);

export default Definition;

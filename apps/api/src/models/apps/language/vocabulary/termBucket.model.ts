// Container document that represents a profile's word list for a specific mini-app.
// One bucket is created per profile per mini-app the first time they add a term.
// Think of it as the "deck" header — the actual term entries live in bucketEntry.model.ts.
// The compound unique index ensures each profile has at most one bucket per mini-app.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface ITermBucketDocument extends Document {
  _id: Types.ObjectId;
  profileId: Types.ObjectId;
  miniAppId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const termBucketSchema = new Schema<ITermBucketDocument>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp', required: true },
  },
  { timestamps: true }
);

termBucketSchema.index({ profileId: 1, miniAppId: 1 }, { unique: true });

const TermBucket: Model<ITermBucketDocument> = mongoose.model<ITermBucketDocument>(
  'TermBucket',
  termBucketSchema
);

export default TermBucket;

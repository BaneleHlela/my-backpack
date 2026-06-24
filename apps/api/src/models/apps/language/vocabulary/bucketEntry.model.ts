// One record per term in a TermBucket. Tracks whether the profile is currently learning,
// has mastered, or has paused a specific word.
//
// 'profileId' is denormalised here (also on the bucket) so queries like
// "all learning terms for profile X across all mini-apps" can hit this collection
// directly without a join through TermBucket.
//
// Status transitions:
//   learning → mastered  (driven by LearningRecord.status reaching 'mastered')
//   mastered → learning  (if confidence drops back below threshold — rare)
//   any      → paused    (profile explicitly pauses the word)
//   paused   → learning  (profile resumes)
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type EntryStatus = 'learning' | 'mastered' | 'paused';

export interface IBucketEntryDocument extends Document {
  _id: Types.ObjectId;
  bucketId: Types.ObjectId;
  termId: Types.ObjectId;
  profileId: Types.ObjectId;
  addedAt: Date;
  status: EntryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const bucketEntrySchema = new Schema<IBucketEntryDocument>(
  {
    bucketId: { type: Schema.Types.ObjectId, ref: 'TermBucket', required: true },
    termId: { type: Schema.Types.ObjectId, ref: 'Term', required: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    addedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['learning', 'mastered', 'paused'],
      default: 'learning',
    },
  },
  { timestamps: true }
);

bucketEntrySchema.index({ bucketId: 1, termId: 1 }, { unique: true });
bucketEntrySchema.index({ profileId: 1, status: 1 });

const BucketEntry: Model<IBucketEntryDocument> = mongoose.model<IBucketEntryDocument>(
  'BucketEntry',
  bucketEntrySchema
);

export default BucketEntry;

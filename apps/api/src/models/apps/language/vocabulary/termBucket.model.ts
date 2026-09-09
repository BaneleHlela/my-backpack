// Named vocabulary collections. Favorites is unique per profile/dictionary.
// Run migrate:multiple-buckets before enabling creation on an existing database.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface ITermBucketDocument extends Document {
  _id: Types.ObjectId;
  profileId: Types.ObjectId;
  miniAppId: Types.ObjectId;
  name: string;
  description: string;
  color: string;
  visibility: 'private' | 'public';
  isFavorites: boolean;
  includeInQuiz: boolean;
  copiedFrom?: Types.ObjectId;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

const termBucketSchema = new Schema<ITermBucketDocument>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    miniAppId: { type: Schema.Types.ObjectId, ref: 'MiniApp', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60, default: 'Favorites' },
    description: { type: String, trim: true, maxlength: 240, default: '' },
    color: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: '#A78BFA' },
    visibility: { type: String, enum: ['private', 'public'], default: 'private' },
    isFavorites: { type: Boolean, default: false },
    includeInQuiz: { type: Boolean, default: true },
    copiedFrom: { type: Schema.Types.ObjectId, ref: 'TermBucket' },
    revision: { type: Number, default: 0 },
  },
  { timestamps: true }
);

termBucketSchema.index({ profileId: 1, miniAppId: 1, isFavorites: 1 }, {
  unique: true, partialFilterExpression: { isFavorites: true }, name: 'one_favorites_per_dictionary',
});
termBucketSchema.index({ profileId: 1, miniAppId: 1, includeInQuiz: 1 });
termBucketSchema.index({ miniAppId: 1, visibility: 1, updatedAt: -1 });

const TermBucket: Model<ITermBucketDocument> = mongoose.model<ITermBucketDocument>(
  'TermBucket',
  termBucketSchema
);

export default TermBucket;

import mongoose, { Schema, Types } from 'mongoose';

interface QuizBucketPreference {
  profileId: Types.ObjectId;
  quizId: Types.ObjectId;
  playModeId: string;
  bucketIds: Types.ObjectId[] | null;
}

const schema = new Schema<QuizBucketPreference>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    playModeId: { type: String, required: true },
    bucketIds: {
      type: [Schema.Types.ObjectId],
      ref: 'TermBucket',
      default: null,
    },
  },
  { timestamps: true }
);
schema.index({ profileId: 1, quizId: 1, playModeId: 1 }, { unique: true });
export default mongoose.model<QuizBucketPreference>(
  'QuizBucketPreference',
  schema
);

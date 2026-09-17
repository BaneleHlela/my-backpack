import mongoose, { Schema, Types } from 'mongoose';
import type { XpAward, XpContext } from '@my-backpack/shared';

export interface IXpAward extends XpAward {
  _id: Types.ObjectId; // The session ID is the unique award ID.
  profileId: Types.ObjectId;
  context: XpContext;
  title: string;
  earnedAt: Date;
  bonusKey?: string;
}

const schema = new Schema<IXpAward>({
  _id: { type: Schema.Types.ObjectId, required: true },
  profileId: { type: Schema.Types.ObjectId, required: true },
  context: { type: Schema.Types.Mixed, required: true },
  title: { type: String, required: true },
  earnedAt: { type: Date, required: true },
  base: { type: Number, required: true, min: 0 },
  bonus: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  bonusRate: { type: Number, required: true },
  bonusReason: { type: String, required: true },
  bonusKey: { type: String },
});
// One atomic insert both awards XP and claims the day's bonus. No separate counter can drift.
schema.index({ bonusKey: 1 }, { unique: true, sparse: true });
schema.index({ profileId: 1, earnedAt: -1 });
export default mongoose.model<IXpAward>('XpAward', schema);

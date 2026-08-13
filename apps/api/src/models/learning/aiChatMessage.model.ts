// A single turn in a learner's AI Helper chat for one course. Course Chat's AI Helper is a
// 1:1 conversation between one profile and the AI, scoped to one course — history persists
// indefinitely (no reset, no TTL) so a learner can leave and come back to the same thread.
// Never wraps in a session document — each message is its own row, ordered by createdAt.
//
// The `{ profileId, role: 'user', createdAt: -1 }` index backs both rate-limit checks used by
// aiChat.service.ts (5s cooldown since the last user message, 50/day rolling-24h cap) — both
// are derived from this collection directly rather than a separate counter/Redis, since neither
// has an existing precedent in this codebase and this avoids adding new infra for it.
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type AiChatRole = 'user' | 'assistant';

export interface IAiChatMessageDocument extends Document {
  _id: Types.ObjectId;
  profileId: Types.ObjectId;
  courseId: Types.ObjectId;
  role: AiChatRole;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiChatMessageSchema = new Schema<IAiChatMessageDocument>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

// Ordered history fetch for one profile's thread in one course.
aiChatMessageSchema.index({ profileId: 1, courseId: 1, createdAt: 1 });
// Rate-limit lookups (cooldown + daily cap) — across all of a profile's courses.
aiChatMessageSchema.index({ profileId: 1, role: 1, createdAt: -1 });

const AiChatMessage: Model<IAiChatMessageDocument> = mongoose.model<IAiChatMessageDocument>(
  'AiChatMessage',
  aiChatMessageSchema
);

export default AiChatMessage;

// Mongoose model for Account — handles authentication only, not app usage
import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAuthProvider {
  provider: 'local' | 'google' | 'facebook';
  providerId: string;
}

export interface IAccountDocument extends Document {
  _id: Types.ObjectId;
  email?: string;
  password?: string;
  authProviders: IAuthProvider[];
  profiles: Types.ObjectId[];
  activeProfile?: Types.ObjectId;
  isEmailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiresAt?: Date;
  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const authProviderSchema = new Schema<IAuthProvider>(
  {
    provider: { type: String, enum: ['local', 'google', 'facebook'], required: true },
    providerId: { type: String, required: true },
  },
  { _id: false }
);

const accountSchema = new Schema<IAccountDocument>(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String },
    authProviders: { type: [authProviderSchema], default: [] },
    profiles: [{ type: Schema.Types.ObjectId, ref: 'Profile' }],
    activeProfile: { type: Schema.Types.ObjectId, ref: 'Profile' },
    isEmailVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpiresAt: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpiresAt: { type: Date },
  },
  { timestamps: true }
);

accountSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

accountSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

const Account: Model<IAccountDocument> = mongoose.model<IAccountDocument>(
  'Account',
  accountSchema
);

export default Account;

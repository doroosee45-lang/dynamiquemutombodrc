import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token:     { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

// MongoDB TTL — auto-deletes expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);

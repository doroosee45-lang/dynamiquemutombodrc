import mongoose, { Schema, Document, Types } from 'mongoose';

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface IPetitionSignature {
  user: Types.ObjectId;
  comment?: string;
  signedAt: Date;
}

export interface ICampaign extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  status: CampaignStatus;
  province?: string;
  district?: string;
  targetCount?: number;
  currentCount: number;
  startDate?: Date;
  endDate?: Date;
  mediaUrls: string[];
  author: Types.ObjectId;
  // Petition embedded
  hasPetition: boolean;
  petitionTarget?: number;
  petitionSignatures: IPetitionSignature[];
  // Participants
  participants: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PetitionSignatureSchema = new Schema<IPetitionSignature>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comment: String,
    signedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CampaignSchema = new Schema<ICampaign>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'DRAFT' },
    province: String,
    district: String,
    targetCount: Number,
    currentCount: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    mediaUrls: [String],
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hasPetition: { type: Boolean, default: false },
    petitionTarget: Number,
    petitionSignatures: [PetitionSignatureSchema],
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

CampaignSchema.index({ status: 1, createdAt: -1 });

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);

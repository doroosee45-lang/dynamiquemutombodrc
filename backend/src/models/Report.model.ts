import mongoose, { Schema, Document, Types } from 'mongoose';

export type ReportStatus = 'PENDING' | 'VERIFIED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type ReportCategory = 'INSECURITY' | 'BANDITRY' | 'TRANSPORT' | 'CORRUPTION' | 'TRIBALISM' | 'ADMINISTRATIVE' | 'OTHER';

export interface IStatusEntry {
  oldStatus: ReportStatus;
  newStatus: ReportStatus;
  note?: string;
  changedBy: Types.ObjectId;
  createdAt: Date;
}

export interface IVote {
  user: Types.ObjectId;
  value: 1 | -1;
}

export interface IReport extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  province: string;
  district?: string;
  commune?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  mediaUrls: string[];
  isAnonymous: boolean;
  ipHash?: string;
  confidenceScore?: number;
  isFlagged: boolean;
  flagReason?: string;
  aiTags?: string[];
  aiSentiment?: string;
  aiSummary?: string;
  viewCount: number;
  author?: Types.ObjectId;
  moderatorId?: Types.ObjectId;
  moderatorNote?: string;
  votes: IVote[];
  statusHistory: IStatusEntry[];
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StatusEntrySchema = new Schema<IStatusEntry>(
  {
    oldStatus: { type: String, required: true },
    newStatus: { type: String, required: true },
    note: String,
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const VoteSchema = new Schema<IVote>(
  { user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, value: { type: Number, enum: [1, -1], required: true } },
  { _id: false }
);

const ReportSchema = new Schema<IReport>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['INSECURITY', 'BANDITRY', 'TRANSPORT', 'CORRUPTION', 'TRIBALISM', 'ADMINISTRATIVE', 'OTHER'], required: true },
    status: { type: String, enum: ['PENDING', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'], default: 'PENDING', index: true },
    province: { type: String, required: true, index: true },
    district: String,
    commune: String,
    address: String,
    latitude: Number,
    longitude: Number,
    mediaUrls: [String],
    isAnonymous: { type: Boolean, default: false },
    ipHash: String,
    confidenceScore: Number,
    isFlagged: { type: Boolean, default: false },
    flagReason: String,
    aiTags: [String],
    aiSentiment: String,
    aiSummary: String,
    viewCount: { type: Number, default: 0 },
    author: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    moderatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    moderatorNote: String,
    votes: [VoteSchema],
    statusHistory: [StatusEntrySchema],
    resolvedAt: Date,
  },
  { timestamps: true }
);

ReportSchema.index({ category: 1 });
ReportSchema.index({ createdAt: -1 });
ReportSchema.index({ latitude: 1, longitude: 1 });

export const Report = mongoose.model<IReport>('Report', ReportSchema);

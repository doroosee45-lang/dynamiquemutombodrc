import mongoose, { Schema, Document, Types } from 'mongoose';

export type PublicationType = 'INVESTIGATION' | 'ALERT' | 'COMMUNIQUE' | 'CAMPAIGN' | 'NEWS';

export interface IPublication extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string;
  excerpt: string;
  type: PublicationType;
  category?: string;
  province?: string;
  district?: string;
  isUrgent: boolean;
  isPinned: boolean;
  mediaUrls: string[];
  tags: string[];
  viewCount: number;
  author: Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PublicationSchema = new Schema<IPublication>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    excerpt: { type: String, default: '' },
    type: { type: String, enum: ['INVESTIGATION', 'ALERT', 'COMMUNIQUE', 'CAMPAIGN', 'NEWS'], required: true },
    category: String,
    province: String,
    district: String,
    isUrgent: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    mediaUrls: [String],
    tags: [String],
    viewCount: { type: Number, default: 0 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: Date,
  },
  { timestamps: true }
);

PublicationSchema.index({ publishedAt: -1 });
PublicationSchema.index({ isPinned: -1, isUrgent: -1 });
PublicationSchema.index({ province: 1 });

export const Publication = mongoose.model<IPublication>('Publication', PublicationSchema);

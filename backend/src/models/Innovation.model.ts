import mongoose, { Schema, Document, Types } from 'mongoose';

export type DevelopmentStage = 'IDEA' | 'PROTOTYPE' | 'MVP' | 'FUNCTIONAL';

export interface IInnovation extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  province?: string;
  problemStatement?: string;
  targetAudience?: string;
  developmentStage?: DevelopmentStage;
  expectedImpact?: string;
  resourcesNeeded?: string;
  demoUrl?: string;
  mediaUrls: string[];
  isValidated: boolean;
  mentorNote?: string;
  author: Types.ObjectId;
  votes: { user: Types.ObjectId; value: 1 | -1 }[];
  createdAt: Date;
  updatedAt: Date;
}

const InnovationSchema = new Schema<IInnovation>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    province: String,
    problemStatement: String,
    targetAudience: String,
    developmentStage: { type: String, enum: ['IDEA', 'PROTOTYPE', 'MVP', 'FUNCTIONAL'] },
    expectedImpact: String,
    resourcesNeeded: String,
    demoUrl: String,
    mediaUrls: [String],
    isValidated: { type: Boolean, default: false },
    mentorNote: String,
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    votes: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        value: { type: Number, enum: [1, -1], required: true },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

InnovationSchema.index({ isValidated: 1, createdAt: -1 });

export const Innovation = mongoose.model<IInnovation>('Innovation', InnovationSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface INewsletter extends Document {
  email: string;
  isActive: boolean;
  unsubscribeToken: string;
  subscribedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSchema = new Schema<INewsletter>(
  {
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    isActive:         { type: Boolean, default: true },
    unsubscribeToken: { type: String, required: true, unique: true },
    subscribedAt:     { type: Date, default: Date.now },
  },
  { timestamps: true }
);

NewsletterSchema.index({ isActive: 1 });

export const Newsletter = mongoose.model<INewsletter>('Newsletter', NewsletterSchema);

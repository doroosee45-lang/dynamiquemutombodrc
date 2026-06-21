import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  fullName: string;
  email:    string;
  phone?:   string;
  subject:  string;
  message:  string;
  isRead:   boolean;
  isUrgent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    fullName: { type: String, required: true },
    email:    { type: String, required: true },
    phone:    { type: String },
    subject:  { type: String, required: true },
    message:  { type: String, required: true },
    isRead:   { type: Boolean, default: false },
    isUrgent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ContactSchema.index({ createdAt: -1 });
ContactSchema.index({ isRead: 1 });

export const Contact = mongoose.model<IContact>('Contact', ContactSchema);

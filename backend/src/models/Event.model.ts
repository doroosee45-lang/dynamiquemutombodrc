import mongoose, { Schema, Document, Types } from 'mongoose';

export type EventStatus = 'UPCOMING' | 'ONGOING' | 'PAST' | 'CANCELLED';

export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  date: Date;
  endDate?: Date;
  location: string;
  province?: string;
  district?: string;
  imageUrl?: string;
  status: EventStatus;
  isPublic: boolean;
  registrationLink?: string;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title:            { type: String, required: true, trim: true },
    description:      { type: String, required: true },
    date:             { type: Date, required: true },
    endDate:          Date,
    location:         { type: String, required: true },
    province:         String,
    district:         String,
    imageUrl:         String,
    status:           { type: String, enum: ['UPCOMING', 'ONGOING', 'PAST', 'CANCELLED'], default: 'UPCOMING' },
    isPublic:         { type: Boolean, default: true },
    registrationLink: String,
    author:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

EventSchema.index({ date: 1, status: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);

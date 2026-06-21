import { Schema, model, Document, Types } from 'mongoose';

export type JoinStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IJoinRequest extends Document {
  /* Step 1 — Identité */
  fullName:    string;
  firstName:   string;
  gender?:     'M' | 'F' | 'OTHER';
  birthDate?:  Date;
  /* Step 2 — Localisation */
  province:    string;
  district?:   string;
  commune?:    string;
  quartier?:   string;
  address?:    string;
  /* Step 3 — Contact */
  email:       string;
  phone:       string;
  whatsapp?:   string;
  socialMedia?: string;
  /* Step 4 — Engagement */
  motivation:  string;
  howKnown:    string;
  skills?:     string;
  availability?: string;
  previousExperience?: string;
  /* Meta */
  status:      JoinStatus;
  reviewedBy?: Types.ObjectId;
  reviewNote?: string;
  reviewedAt?: Date;
}

const JoinRequestSchema = new Schema<IJoinRequest>(
  {
    fullName:    { type: String, required: true },
    firstName:   { type: String, required: true },
    gender:      { type: String, enum: ['M', 'F', 'OTHER'] },
    birthDate:   Date,

    province:    { type: String, required: true, index: true },
    district:    String,
    commune:     String,
    quartier:    String,
    address:     String,

    email:       { type: String, required: true, lowercase: true },
    phone:       { type: String, required: true },
    whatsapp:    String,
    socialMedia: String,

    motivation:          { type: String, required: true },
    howKnown:            { type: String, required: true },
    skills:              String,
    availability:        String,
    previousExperience:  String,

    status:      { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
    reviewedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNote:  String,
    reviewedAt:  Date,
  },
  { timestamps: true },
);

export const JoinRequest = model<IJoinRequest>('JoinRequest', JoinRequestSchema);

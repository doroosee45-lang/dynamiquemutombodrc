import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type Role = 'CITIZEN' | 'MODERATOR' | 'EDITOR' | 'DISTRICT_ADMIN' | 'ADMIN' | 'SUPERADMIN';
export type BadgeType = 'OBSERVER' | 'ACTIVIST' | 'CITIZEN_LEADER' | 'INNOVATOR';
export type District = 'LUKUNGA' | 'FUNA' | 'MONT_AMBA' | 'TSHANGU';

export interface IUserBadge {
  badge: BadgeType;
  awardedAt: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  role: Role;
  province?: string;
  district?: District;
  commune?: string;
  bio?: string;
  isEmailVerified: boolean;
  emailVerifyToken?: string;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  twoFASecret?: string;
  twoFAEnabled: boolean;
  reputationPoints: number;
  isBanned: boolean;
  banReason?: string;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  badges: IUserBadge[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const BadgeSchema = new Schema<IUserBadge>(
  { badge: { type: String, enum: ['OBSERVER', 'ACTIVIST', 'CITIZEN_LEADER', 'INNOVATOR'], required: true }, awardedAt: { type: Date, default: Date.now } },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    fullName: { type: String, required: true, trim: true },
    phone: String,
    avatar: String,
    role: { type: String, enum: ['CITIZEN', 'MODERATOR', 'EDITOR', 'DISTRICT_ADMIN', 'ADMIN', 'SUPERADMIN'], default: 'CITIZEN' },
    province: { type: String, index: true },
    district: { type: String, enum: ['LUKUNGA', 'FUNA', 'MONT_AMBA', 'TSHANGU'] },
    commune: String,
    bio: String,
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    twoFASecret: { type: String, select: false },
    twoFAEnabled: { type: Boolean, default: false },
    reputationPoints: { type: Number, default: 0, index: true },
    isBanned: { type: Boolean, default: false },
    banReason: String,
    lastLoginAt: Date,
    lastLoginIp: String,
    badges: [BadgeSchema],
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);

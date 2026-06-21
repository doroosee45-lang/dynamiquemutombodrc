import mongoose, { Schema, Document, Types } from 'mongoose';

export type MessageType = 'GLOBAL' | 'GROUP' | 'DIRECT';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  content: string;
  type: MessageType;
  sender: Types.ObjectId;
  receiverId?: Types.ObjectId;
  groupId?: string;
  isModerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    content: { type: String, required: true },
    type: { type: String, enum: ['GLOBAL', 'GROUP', 'DIRECT'], required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User' },
    groupId: String,
    isModerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ type: 1, createdAt: -1 });
MessageSchema.index({ groupId: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, receiverId: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

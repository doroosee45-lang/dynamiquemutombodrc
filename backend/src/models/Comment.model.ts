import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment extends Document {
  _id: Types.ObjectId;
  content: string;
  author: Types.ObjectId;
  reportId?: Types.ObjectId;
  publicationId?: Types.ObjectId;
  parentId?: Types.ObjectId;
  isApproved: boolean;
  isFlagged: boolean;
  votes: { user: Types.ObjectId; value: 1 | -1 }[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportId: { type: Schema.Types.ObjectId, ref: 'Report', index: true },
    publicationId: { type: Schema.Types.ObjectId, ref: 'Publication', index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    isApproved: { type: Boolean, default: false },
    isFlagged: { type: Boolean, default: false },
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

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);

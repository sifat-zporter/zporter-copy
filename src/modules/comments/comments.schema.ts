import { Schema, SchemaOptions, Document } from 'mongoose';
import { CommentEntity } from './ comments.entity';

const SchemaOption: SchemaOptions = {
  timestamps: true,
};

export const CommentSchema = new Schema<CommentEntity>(
  {
    type: { type: String, required: true },
    typeId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true, ref: 'users' },
    comments: { type: String, required: true },
    like: { type: Number, default: 0, required: false },
  },
  SchemaOption,
);

CommentSchema.virtual('users', {
  ref: 'users',
  localField: 'userId',
  foreignField: 'userId',
  justOne: true,
});

export type CommentDocument = CommentEntity & Document;

export const COMMENTS_NAME = 'comments';

import * as mongoose from 'mongoose';

export interface Tags {
  name: string;
  type: string;
  createdAt?: number;
  updatedAt?: number;
}

const TAG_MODEL = 'tags';

const TagsSchema = new mongoose.Schema(
  {
    name: { type: String },
    type: { type: String },
    createdAt: Number,
    updatedAt: Number,
  },
  {
    timestamps: true,
  },
);

TagsSchema.index({ name: 'text', type: 'text' });
export { TagsSchema, TAG_MODEL };

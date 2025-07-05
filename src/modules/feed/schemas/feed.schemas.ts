import * as mongoose from 'mongoose';

export interface Feed {
  postId: string;
  data: any;
  priority: number;
  userIds: string[];
  friendIds: string[];
  teammateIds: string[];
  createdAt: number;
  updatedAt: number;
}

const FEED_MODEL = 'feeds';

const FeedsSchema = new mongoose.Schema({
  postId: { type: String, index: 'hashed' },
  userIds: [String],
  friendIds: [String],
  teammateIds: [String],
  priority: { type: Number, index: true },
  data: Object,
  createdAt: { type: Number, index: true },
  updatedAt: Number,
});
export { FeedsSchema, FEED_MODEL };

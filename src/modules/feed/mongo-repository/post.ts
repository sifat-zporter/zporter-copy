import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema()
export class Post {
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  _id: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.Array })
  userIds: string[];

  @Prop({ type: mongoose.Schema.Types.Mixed })
  data: Object;

  @Prop({ type: mongoose.Schema.Types.Array })
  friendIds: string[];

  @Prop({ type: String })
  postId: string;

  @Prop({ type: mongoose.Schema.Types.Array })
  teammateIds: string[];

  @Prop({ type: Number })
  priority: number;

  @Prop({ type: Number })
  updatedAt: number;

  @Prop({ type: Number })
  createdAt: number;
}

const PostSchema = SchemaFactory.createForClass(Post);

export { PostSchema };

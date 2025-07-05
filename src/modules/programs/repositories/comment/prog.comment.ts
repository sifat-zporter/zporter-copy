import { Types } from 'mongoose';

export class ProgComment {
  _id: Types.ObjectId;

  content: string;

  createdBy: string;

  likeUserIds: string[];

  createdAt: Date;
}

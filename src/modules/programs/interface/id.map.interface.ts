import { Types } from 'mongoose';

export interface IIdMap {
  [key: string]: Types.ObjectId;
}

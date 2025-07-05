import mongoose from 'mongoose';

export interface ILibEntity {
  _id: mongoose.Types.ObjectId;
  [key: string]: any;
}

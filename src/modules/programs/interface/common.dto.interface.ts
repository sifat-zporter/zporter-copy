import mongoose from 'mongoose';

export type ICommonProgramDto = {
  id?: mongoose.Types.ObjectId;
  _id?: mongoose.Types.ObjectId;
  [key: string]: any;
};

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { UserSubtypeResponse } from '../../dtos/user-test/user-subtype.response';
import { TestLevel } from '../../enums/test-level';

@Schema()
export class ResultStorage {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  _id: mongoose.Types.ObjectId;

  @Prop({ type: String, required: true })
  testType: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: Number, required: true })
  avgIndexPoint: number;

  @Prop({ type: String, required: true })
  level: TestLevel;

  @Prop({ type: mongoose.SchemaTypes.Array })
  listResponses: UserSubtypeResponse[];

  @Prop({ type: Number, required: true })
  verifiedTime: number;
}
export const ResultStorageSchema = SchemaFactory.createForClass(ResultStorage);
export const RESULT_STORAGE_MODEL = 'test_result_storages';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongoSchema } from 'mongoose';
import { GenderTypes } from '../../../../common/constants/common.constant';
import { Role } from '../../../diaries/enum/diaries.enum';
import { ProgressStatus } from '../../enums/progress.status';
import { TargetType } from '../../enums/target.type';
import { Country } from '../program/country';

@Schema({
  timestamps: {
    createdAt: true,
    updatedAt: true,
  },
})
export class UserExecution {
  @Prop({ type: MongoSchema.Types.ObjectId })
  _id: Types.ObjectId;

  @Prop({ type: MongoSchema.Types.ObjectId })
  parentId?: Types.ObjectId;

  @Prop({ type: String })
  userId: string;

  @Prop({ type: MongoSchema.Types.ObjectId })
  programId: Types.ObjectId;
  @Prop({ type: MongoSchema.Types.ObjectId })
  sessionId: Types.ObjectId;
  @Prop({ type: MongoSchema.Types.ObjectId })
  exerciseId: Types.ObjectId;

  @Prop({ type: MongoSchema.Types.ObjectId })
  targetId: Types.ObjectId;

  @Prop(String)
  targetType: TargetType;

  @Prop(String)
  status: ProgressStatus;

  @Prop(Boolean)
  isDeleted: boolean;

  @Prop({ type: String, required: false })
  programCreatedBy?: string;

  @Prop({ type: String, required: false })
  country?: string;

  @Prop({ type: MongoSchema.Types.Mixed, required: false })
  birthCountry?: Country;

  @Prop({ type: String, required: false })
  city?: string;

  @Prop({ type: String, required: false })
  place?: string;

  @Prop({ type: String, required: false })
  gender?: GenderTypes;

  @Prop({ type: Number, required: false })
  birthYear?: number;

  @Prop({ type: Array, required: false })
  role?: Role[];

  createdAt: Date;
  updatedAt: Date;

  constructor(userExercise: UserExecution) {
    return Object.assign(this, userExercise);
  }
}
const USER_EXERCISES_MODEL = 'program_user_datas';
const UserExerciseSchema = SchemaFactory.createForClass(UserExecution);

export { USER_EXERCISES_MODEL, UserExerciseSchema };

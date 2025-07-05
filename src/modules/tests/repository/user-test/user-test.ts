import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { GenderTypes } from '../../../../common/constants/common.constant';
import { Role } from '../../../diaries/enum/diaries.enum';
import { UserTypes } from '../../../users/enum/user-types.enum';
import { Metric } from '../../enums/metric';
import { TestLevel } from '../../enums/test-level';
import { MediaSource } from '../test/media-source';
import { Country } from './country';

@Schema({ autoIndex: true })
export class UserTest {
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  _id: mongoose.Types.ObjectId;

  @Prop({ type: String })
  subtypeId: string;
  @Prop({ type: String })
  testId: string;

  @Prop({ type: String })
  controllerId: string;
  @Prop({ type: String })
  controllerUsername: string;
  @Prop({ type: String })
  controllerLink: string;
  @Prop({ type: String })
  controllerType: UserTypes;
  @Prop({ type: String })
  controllerFullname: string;

  @Prop({ type: String })
  userId: string;
  @Prop({ type: String })
  faceImage: string;
  @Prop({ type: String })
  username: string;
  @Prop({ type: String })
  userType: UserTypes;
  @Prop({ type: mongoose.Schema.Types.Mixed })
  birthCountry: Country;

  @Prop({ type: String })
  country: string;
  @Prop({ type: String })
  birthYear: string;
  @Prop({ type: String })
  gender: GenderTypes;
  @Prop({ type: String })
  clubId: string;
  @Prop({ type: String })
  teamId: string;
  @Prop({ type: Array })
  role: Role[];
  @Prop({ type: Number })
  bodyWeight: number;

  @Prop({ type: String })
  title: string;
  @Prop({ type: Number })
  value: number;
  @Prop({ type: String })
  metric: Metric;
  @Prop({ type: Number })
  point: number;
  // lastPoint: number;
  // changingTurn: ChangingTurn;

  @Prop({ type: Number })
  executedTime: number;
  @Prop({ type: String })
  date: string;
  @Prop({ type: String })
  time: string;

  @Prop({ type: String })
  arena: string;
  @Prop({ type: Array })
  media: MediaSource[];
  @Prop({ type: String })
  level: TestLevel;

  @Prop({ type: Boolean })
  isPublic: boolean;
  @Prop({ type: Boolean })
  isDeleted: boolean;
  @Prop({ type: Boolean })
  isVerified: boolean;
  @Prop({ type: Boolean })
  isConfirmed: boolean;

  @Prop({ type: Number })
  createdAt: number;
  @Prop({ type: Number })
  updatedAt: number;
  @Prop({ type: Date, required: false })
  deletedAt?: Date;

  public constructor(partial: Partial<UserTest>);
  public constructor();
  public constructor(...args: any[]) {
    if (args.length == 1) {
      Object.assign(this, args[0]);
    } else {
      return this;
    }
  }
}

const USER_TEST_MODEL = 'user_tests';
const UserTestSchema = SchemaFactory.createForClass(UserTest);

export { USER_TEST_MODEL, UserTestSchema };

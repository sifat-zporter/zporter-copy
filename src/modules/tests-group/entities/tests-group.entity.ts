import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { TestLevel } from '../../tests/enums/test-level';
import { Member, Test, Team } from '../types';

@Schema({ autoIndex: true })
export class TestsGroup {
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  _id: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.Array })
  teamIds: Team[];

  @Prop({ type: mongoose.Schema.Types.Array })
  groupIds: string[];

  @Prop({ type: Date })
  date: Date;

  @Prop({ type: String })
  location: string;

  @Prop({ type: String })
  level: TestLevel;

  @Prop({ type: mongoose.SchemaTypes.Array })
  tests: Test[];

  @Prop({ type: mongoose.Schema.Types.Array })
  members: Member[];

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: String })
  createdBy: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  public constructor(partial: Partial<TestsGroup>);

  public constructor();

  public constructor(...args: any[]) {
    if (args.length == 1) {
      Object.assign(this, args[0]);
    } else {
      return this;
    }
  }
}

const TESTS_GROUP_MODEL = 'tests_group';
const TestsGroupSchema = SchemaFactory.createForClass(TestsGroup);

export { TESTS_GROUP_MODEL, TestsGroupSchema };

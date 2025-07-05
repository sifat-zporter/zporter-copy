import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { TestType } from '../../enums/test-type';
import { Test } from '../test/test';

@Schema()
export class Subtype {
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  _id: mongoose.Types.ObjectId;
  @Prop({ type: String })
  createdBy: string;
  @Prop({ type: String })
  testType: TestType;
  @Prop({ type: String })
  subtypeName: string;

  @Prop({ type: mongoose.Schema.Types.Array })
  tests: Test[];
  @Prop({ type: mongoose.Schema.Types.Array })
  deletedTests: Test[];

  @Prop({ type: Number })
  createdAt: number;
  @Prop({ type: Number })
  updatedAt: number;
  @Prop({ type: Boolean })
  isDeleted: boolean;

  public constructor(subtype: Subtype);
  public constructor();
  public constructor(...args: any[]) {
    if (args.length == 1) {
      Object.assign(this, args[0]);
    } else {
      return new Subtype();
    }
  }
}
const SUBTYPE_MODEL = 'subtype_tests';
const SubtypeSchema = SchemaFactory.createForClass(Subtype);

export { SUBTYPE_MODEL, SubtypeSchema };

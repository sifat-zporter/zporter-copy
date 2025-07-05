import mongoose from 'mongoose';
import { MediaDto } from '../../../diaries/dto/diary.dto';
import { Rating } from '../rating/rating';
import { ILibEntity } from '../../../libraries/interface/entity.interface';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { TypeOfPrograms } from '../../enums/type-of-programs';
import { PROGRAMS_MODEL } from '../program/program';

@Schema({
  timestamps: {
    createdAt: true,
    updatedAt: true,
  },
})
export class Session implements ILibEntity {
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  _id: mongoose.Types.ObjectId;
  @Prop(String)
  idRoot?: string;
  @Prop({ type: Number, default: 0 })
  index: number;

  @Prop(String)
  createdBy: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: PROGRAMS_MODEL })
  programId: mongoose.Types.ObjectId;

  @Prop(String)
  headline: string;
  @Prop(String)
  ingressText: string;
  @Prop(Array)
  media: MediaDto[];
  @Prop(String)
  description: string;
  @Prop(String)
  minParticipants: string;
  @Prop(String)
  timeRun: string;
  @Prop(Array)
  tags: string[];
  @Prop({ type: Number, default: 1 })
  ageFrom: number;
  @Prop({ type: Number, default: 100 })
  ageTo: number;

  @Prop({ type: mongoose.Schema.Types.Array })
  bookmarkUserIds: string[];

  @Prop(String)
  location: string;
  @Prop(String)
  targetGroup: string;
  @Prop({ type: String })
  mainCategory: TypeOfPrograms;
  @Prop({ type: Array })
  collections: string[];
  @Prop(String)
  shareWith: string;

  @Prop(Number)
  technics: number;
  @Prop(Number)
  tactics: number;
  @Prop(Number)
  physics: number;
  @Prop(Number)
  mental: number;
  @Prop(Number)
  physicallyStrain: number;

  @Prop(Number)
  order: number;
  @Prop(Number)
  day: number;

  @Prop(Number)
  avgStar: number;
  @Prop(Array)
  ratings: Rating[];

  @Prop(Boolean)
  isPublic: boolean;

  @Prop(Date)
  createdAt: Date;
  @Prop(Date)
  updatedAt: Date;
  @Prop(Boolean)
  isDeleted: boolean;
  @Prop(Date)
  deletedAt?: Date;

  public constructor(session: Session);
  public constructor();
  public constructor(...args: any[]) {
    if (args.length == 0) {
      return this;
    }
    if (args.length == 1) {
      Object.assign(this, args[0]);
    }
  }
}

export const PROGRAM_SESSIONS_MODEL = 'program_sessions';
export const SessionSchema = SchemaFactory.createForClass(Session);

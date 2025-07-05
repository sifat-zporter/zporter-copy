import mongoose, { Document } from 'mongoose';
import { Role } from '../../../diaries/enum/diaries.enum';
import { ILibEntity } from '../../../libraries/interface/entity.interface';
import { UserTypes } from '../../../users/enum/user-types.enum';
import { TypeOfPrograms } from '../../enums/type-of-programs';
import { Country } from './country';
import { MediaSource } from './media-source';
import { Rating } from '../rating/rating';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: {
    createdAt: true,
    updatedAt: true,
  },
})
export class Program implements ILibEntity {
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  _id: mongoose.Types.ObjectId;
  @Prop(String)
  idRoot?: string;
  @Prop({ type: Number, default: 0 })
  index: number;

  @Prop(String)
  createdBy: string;
  @Prop({ type: String, default: 'Zporter Anonymous' })
  fullname: string;
  @Prop(String)
  username: string;
  @Prop(mongoose.Schema.Types.Mixed)
  birthCountry: Country;
  @Prop(String)
  country: string;
  @Prop(String)
  city: string;
  @Prop(String)
  clubId: string;
  @Prop({ type: String, default: UserTypes.PLAYER })
  userType: UserTypes;
  @Prop(Number)
  birthYear: number;
  @Prop({ type: mongoose.Schema.Types.Array, default: 'CAM' })
  role: Role[];

  @Prop({ type: mongoose.Schema.Types.Array, default: [] })
  bookmarkUserIds: string[];

  @Prop(Number)
  numberExecuted: number;

  @Prop(String)
  headline: string;
  @Prop({ type: String, default: null })
  ingressText: string;
  @Prop({ type: String, default: null })
  description: string;
  @Prop({ type: mongoose.Schema.Types.Array })
  media: MediaSource[];
  @Prop({ type: String, default: '2' })
  minParticipants: string;
  @Prop(String)
  timeRun: string;
  @Prop({ type: mongoose.Schema.Types.Array, default: [] })
  tags: string[];
  @Prop({ type: Number, default: 1 })
  ageFrom: number;
  @Prop({ type: Number, default: 100 })
  ageTo: number;

  @Prop({ type: String, default: 'Field' })
  location: string;
  @Prop({ type: String, default: Role.ALL })
  targetGroup: Role;
  @Prop({ type: String, default: TypeOfPrograms.OTHER })
  mainCategory: TypeOfPrograms;
  @Prop({ type: Array, default: [] })
  collections: string[];

  @Prop({ type: String, default: 'ALL' })
  shareWith: string;

  @Prop({ type: Number, default: 0 })
  avgStar: number;
  @Prop({ type: mongoose.Schema.Types.Array, default: [] })
  ratings: Rating[];

  @Prop({ type: Boolean, default: true })
  isPublic: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId })
  libProgramId?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId })
  parentProgramId?: mongoose.Types.ObjectId;

  @Prop({ type: Number, default: 1 })
  version: number;

  @Prop({ type: Boolean, default: false })
  isOldVersion?: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
  @Prop({ type: mongoose.Schema.Types.Date, required: false })
  deletedAt?: Date;
  @Prop(Date)
  createdAt: Date;
  @Prop(Date)
  updatedAt: Date;
}

export const PROGRAMS_MODEL = 'programs';
export const ProgramsSchema = SchemaFactory.createForClass(Program);

export type ProgramsDocument = Program & Document;

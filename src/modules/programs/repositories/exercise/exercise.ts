import { Types, Schema as SchemaMongo } from 'mongoose';
import { MediaDto } from '../../../diaries/dto/diary.dto';
import { Rating } from '../rating/rating';
import { ILibEntity } from '../../../libraries/interface/entity.interface';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from '../../../diaries/enum/diaries.enum';
import { TypeOfPrograms } from '../../enums/type-of-programs';
import { PROGRAMS_MODEL } from '../program/program';
import { PROGRAM_SESSIONS_MODEL } from '../session/session';
import { ProgComment } from '../comment/prog.comment';
@Schema({
  timestamps: {
    createdAt: true,
    updatedAt: true,
  },
})
export class Exercise implements ILibEntity {
  @Prop({ type: SchemaMongo.Types.ObjectId })
  _id: Types.ObjectId;
  @Prop(String)
  idRoot: string;
  @Prop({ type: Number, default: 0 })
  index: number;

  @Prop(String)
  createdBy: string;

  @Prop({ type: SchemaMongo.Types.ObjectId, ref: PROGRAM_SESSIONS_MODEL })
  sessionId: Types.ObjectId;

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

  @Prop(Number)
  order: number;
  // @Prop(Number)
  // day: number;

  @Prop({ type: Number, default: 1 })
  ageFrom: number;
  @Prop({ type: Number, default: 100 })
  ageTo: number;
  @Prop(String)
  location: string;
  @Prop(String)
  targetGroup: Role;
  @Prop(String)
  mainCategory: TypeOfPrograms;
  @Prop(Array)
  collections: string[];
  @Prop(String)
  shareWith: string;

  @Prop(Number)
  avgStar: number;
  @Prop(Array)
  ratings: Rating[];

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

  @Prop(Boolean)
  isPublic: boolean;

  @Prop({ type: SchemaMongo.Types.Array })
  bookmarkUserIds: string[];

  @Prop(Date)
  createdAt: Date;
  @Prop(Date)
  updatedAt: Date;
  @Prop(Boolean)
  isDeleted: boolean;
  @Prop(Date)
  deletedAt?: Date;

  public constructor(partial: Partial<Exercise>);
  public constructor();
  public constructor(...args: any[]) {
    if (args.length == 0) {
      return new Exercise();
    }
    if (args.length == 1) {
      Object.assign(this, args[0]);
    }
  }
}

export const PROGRAM_EXERCISES_MODEL = 'program_exercises';
export const ExerciseSchema = SchemaFactory.createForClass(Exercise);

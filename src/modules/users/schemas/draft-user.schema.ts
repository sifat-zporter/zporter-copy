import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DraftUserDocument = HydratedDocument<DraftUser>;

@Schema({ collection: 'draft-users' })
export class DraftUser {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: String })
  creatorId: string;

  @Prop({ type: String })
  roleId: string;

  @Prop({ type: String })
  secret: string;

  @Prop({ type: String })
  role: string;

  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop({ type: String, default: null })
  birthDay: string | null;

  @Prop({ type: String, default: null })
  gender: string | null;

  @Prop({ type: String })
  firstName: string;

  @Prop({ type: String })
  lastName: string;

  @Prop({ type: Object, default: null })
  country: any;

  @Prop({ type: String, default: null })
  city: string | null;

  @Prop({ type: Object, default: null })
  club: any;

  @Prop({ type: [Object], default: null })
  team: any[];

  @Prop({ type: String, default: null })
  playerRole: string | null;

  @Prop({ type: Number, default: null })
  shirtNumber: number | null;

  @Prop({ type: Number, default: null })
  height: number | null;

  @Prop({ type: Number, default: null })
  weight: number | null;

  @Prop({ type: String, default: null })
  faceImage: string | null;

  @Prop({ type: String, default: null })
  bodyImage: string | null;

  @Prop({ type: String, default: null })
  motherEmail: string | null;

  @Prop({ type: String, default: null })
  fatherEmail: string | null;

  @Prop({ type: Object, default: null })
  payload: any;

  @Prop({ type: String, default: null })
  status: string | null;

  @Prop({ type: String, default: null })
  cardType: string | null;

  @Prop({ type: String, default: null })
  cardImage: string | null;

  @Prop({ type: Date, default: Date.now, index: true })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now, index: true })
  updatedAt: Date;

  @Prop({ type: Date })
  deletedAt: Date;
}

export const DraftUserSchema = SchemaFactory.createForClass(DraftUser);

import mongoose, { Document } from 'mongoose';

export class Team {
  _id: mongoose.Types.ObjectId;
  teamId?: string;
  teamName: string;
  clubId: string;
  ipAddress: string;
  isApproved: boolean;
  isPrivate: boolean;
  teamImage: string;

  blackList: Array<string>;

  createdBy: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export type ITeamDoc = {
  _id: string;
  name: string;
  clubId: string;
  ipAddress: string;
  isApproved: boolean;
  isPrivate: boolean;
  teamImage: string;

  blackList: Array<string>;

  createdBy: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
  clubMongoId: string;
} & Document;

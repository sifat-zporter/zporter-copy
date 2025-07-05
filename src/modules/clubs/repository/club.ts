import mongoose from 'mongoose';

export class Club {
  _id: mongoose.Types.ObjectId;
  arena: string;
  city: string;
  clubName: string;
  country: string;
  createdAt: number;
  createdBy: string;
  ipAddress: string;
  isApproved: boolean;
  isVerified: boolean;
  logoUrl: string;
  nickName: string;
  updatedAt: number;
  clubId: string;
  websiteUrl: string;
}

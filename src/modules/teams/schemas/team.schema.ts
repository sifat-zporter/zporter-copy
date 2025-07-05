import mongoose from 'mongoose';
export const TeamSchema = new mongoose.Schema(
  {
    name: String,
    clubId: String,
    clubRef: String,
    teamImage: String,
    ipAddress: String,
    createdBy: String,

    blackList: Array,

    isApproved: Boolean,
    isPrivate: Boolean,
    isDeleted: Boolean,

    createdAt: Number,
    updatedAt: Number,
  },
  { timestamps: true },
);

TeamSchema.index({ clubId: 1, name: 1 });

export const TEAMS_MODEL = 'teams';

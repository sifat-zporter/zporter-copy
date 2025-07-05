import * as mongoose from 'mongoose';

const CLUB_MODEL = 'clubs';

const ClubsSchema = new mongoose.Schema({
  arena: String,
  city: String,
  clubName: String,
  country: String,
  createdAt: Number,
  createdBy: String,
  ipAddress: String,
  isApproved: Boolean,
  isVerified: Boolean,
  logoUrl: String,
  nickName: String,
  updatedAt: Number,
  clubId: String,
  websiteUrl: String,
});

ClubsSchema.index({ clubName: 'text', clubId: 1 });

export { ClubsSchema, CLUB_MODEL };

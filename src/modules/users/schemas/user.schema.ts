import mongoose from 'mongoose';

const USER_MODEL = 'users';

const UserSchema = new mongoose.Schema({
  // general user
  account: Object,
  uid: String,
  userId: String,
  username: String,
  health: Object,
  media: Object,
  profile: Object,
  settings: Object,
  socialLinks: Object,
  inviterId: String,
  updatedAt: Number,
  createdAt: Number,
  deletedAt: Number,
  isDeleted: Boolean,
  circleCompleted: Number,
  roleId: String,
  timezone: String,
  type: String,
  circleComplete: Number,
  isOnline: Boolean,
  lastActive: Number,
  ips: [String],
  totalPoint: Number,
  timeoutTotalPoint: Number,
  fcmToken: [String],
  // player
  playerCareer: Object,
  playerSkills: Object,
  teamIds: [String],
  // coach
  coachCareer: Object,
  coachSkill: Object,
  // supporter
  supporterFootball: Object,
});

UserSchema.index({
  'profile.firstName': 1,
  'profile.lastName': 1,
  userId: 1,
  roleId: 1,
  'playerCareer.clubId': 1,
  'profile.gender': 1,
  'profile.birthCountry.name': 1,
  'profile.birthDay': 1,
});

export { UserSchema, USER_MODEL };

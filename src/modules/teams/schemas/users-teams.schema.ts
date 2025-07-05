import mongoose from 'mongoose';

export const UsersTeamsSchema = new mongoose.Schema({
  memberType: String,
  status: String,
  teamId: String,
  userId: String,
  updatedAt: Number,
  createdAt: Number,
  isDeleted: Boolean,
  isBlocked: Boolean,
});

export const USERS_TEAMS = 'users_teams';

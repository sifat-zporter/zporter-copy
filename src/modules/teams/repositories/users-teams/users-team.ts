import mongoose from 'mongoose';
import { JoinTeamStatus, MemberType } from '../../dto/teams.req.dto';

export class UsersTeam {
  _id: mongoose.Types.ObjectId;
  memberType: MemberType;
  status: JoinTeamStatus;
  teamId: string;
  userId: string;
  updatedAt: number;
  createdAt: number;
  isBlocked: boolean;
  isDeleted: boolean;
}

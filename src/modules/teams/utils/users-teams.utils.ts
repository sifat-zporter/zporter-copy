import { Injectable } from '@nestjs/common';
import { JoinTeamStatus, MemberType } from '../dto/teams.req.dto';
import { UsersTeam } from '../repositories/users-teams/users-team';
import * as moment from 'moment';
import mongoose from 'mongoose';

Injectable();
export class UsersTeamsUtils {
  public generateUsersTeams<T extends Partial<UsersTeam>>(
    userIds: Array<string>,
    usersTeamsDto: T,
  ): Array<UsersTeam> {
    const nowTime = +moment.utc().format('x');
    return userIds.map((userId) => {
      const newUsersTeams: UsersTeam = {
        _id: new mongoose.Types.ObjectId(),
        memberType: usersTeamsDto.memberType || MemberType.MEMBER,
        status: usersTeamsDto.status || JoinTeamStatus.PENDING,
        teamId: usersTeamsDto.teamId,
        userId,
        updatedAt: usersTeamsDto.updatedAt || nowTime,
        createdAt: usersTeamsDto.createdAt || nowTime,
        isDeleted: usersTeamsDto.isDeleted || false,
        isBlocked: false,
      };
      return newUsersTeams;
    });
  }
}

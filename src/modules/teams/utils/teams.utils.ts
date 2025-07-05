import { Injectable } from '@nestjs/common';
import * as moment from 'moment';
import mongoose from 'mongoose';
import { ZporterIcon } from '../../../common/constants/common.constant';
import { TeamsRequestDto } from '../dto/teams.request.dto';
import { TeamsResponseDto } from '../dto/teams.response.dto';
import { Team } from '../repositories/teams/team';

Injectable();
export class TeamsUtils {
  public generateTeam(teamsRequestDto: TeamsRequestDto): Team {
    const { teamName, clubId, userId } = teamsRequestDto;

    const nowTime = +moment.utc().format('x');

    const newTeam: Team = {
      _id: new mongoose.Types.ObjectId(),
      teamName,
      clubId,
      createdBy: userId,
      ipAddress: teamsRequestDto?.ip || null,
      teamImage: teamsRequestDto?.teamImage || ZporterIcon.WHITE_ICON,

      isPrivate: teamsRequestDto?.isPrivate || false,
      isApproved: false,
      isDeleted: teamsRequestDto?.isDeleted || false,

      createdAt: nowTime,
      updatedAt: nowTime,
      blackList: [],
    };
    return newTeam;
  }

  public generateTeamsResponse(team: Team): TeamsResponseDto {
    const teamResponse: TeamsResponseDto = {
      teamId: team._id.toString(),
      teamName: team.teamName,
      clubId: team.clubId,
      teamImage: team.teamImage,
      ipAddress: team.ipAddress,
      createdBy: team.createdBy,
      isApproved: team.isApproved,
      isPrivate: team.isPrivate,
      isDeleted: team.isDeleted,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      blackList: [],
    };
    return teamResponse;
  }
}

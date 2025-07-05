import { HttpException, HttpStatus } from '@nestjs/common';
import * as moment from 'moment';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { db } from '../../../config/firebase.config';
import { JoinTeamStatus } from '../../../modules/clubs/enum/club.enum';
import {
  CreateNotificationDto,
  NotificationType,
} from '../../../modules/notifications/dto/notifications.req.dto';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { TeamMemberType } from '../../../modules/teams/dto/teams.req.dto';
import { UserTypes } from '../../../modules/users/enum/user-types.enum';

const notificationsService = new NotificationsService();

export class CreateUserTeamsMembersDto {
  memberIds: string[];
  teamId: string;
  flameLinkOwnerId: string;
  teamName: string;
}

export const createUserTeamsMembers = async (
  createUserTeamsMembersDto: CreateUserTeamsMembersDto,
) => {
  const { memberIds, teamId, teamName, flameLinkOwnerId } =
    createUserTeamsMembersDto;

  const addingMember = memberIds.map(async (memId) => {
    const [userTeamRef, memberRef, flamelinkadminRef] = await Promise.all([
      db
        .collection('users_teams')
        .where('teamId', '==', teamId)
        .where('userId', '==', memId)
        .get(),
      db.collection('users').doc(memId).get(),
      db.collection('users').doc(flameLinkOwnerId).get(),
    ]);

    if (!memberRef.data()?.account?.isActive) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!userTeamRef.empty) {
      throw new HttpException(
        ResponseMessage.Team.ALREADY_IN,
        HttpStatus.BAD_REQUEST,
      );
    }

    await db.collection('users_teams').add({
      teamId: teamId,
      userId: memId,
      status: JoinTeamStatus.ACCEPTED,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      memberType: TeamMemberType.MEMBER,
    });

    const payload = new CreateNotificationDto();
    payload.token = memberRef.data()?.fcmToken as string[];
    payload.notificationType = NotificationType.INVITE_MEMBER_TEAM;
    payload.receiverId = memId;
    payload.senderId = flameLinkOwnerId;
    payload.title = `#Zporter added you as a ${TeamMemberType.MEMBER.toLowerCase()} of ${teamName} team`;
    payload.largeIcon =
      process.env.ZPORTER_IMAGE ||
      (flamelinkadminRef.data()?.media?.faceImage as string);
    payload.username = 'Zporter' as string;
    payload.userType = flamelinkadminRef.data()?.type as UserTypes;
    payload.receiverId = memberRef.id as string;
    payload.userType = memberRef.data()?.type as UserTypes;

    payload.others = {
      teamId: teamId,
      memberType: TeamMemberType.MEMBER,
    };

    await notificationsService.sendMulticastNotification(payload);
  });
  await Promise.all(addingMember);
};

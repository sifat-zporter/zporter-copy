import * as moment from 'moment';
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
  ownerIds: string[];
  teamId: string;
  flameLinkOwnerId: string;
  teamName: string;
}

export const createUserTeamsOwners = async (
  createUserTeamsMembersDto: CreateUserTeamsMembersDto,
) => {
  const { ownerIds, teamId, flameLinkOwnerId, teamName } =
    createUserTeamsMembersDto;

  const addingOwners = ownerIds.map(async (ownerId) => {
    await db.collection('users_teams').add({
      teamId: teamId,
      userId: ownerId,
      status: JoinTeamStatus.ACCEPTED,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      memberType: TeamMemberType.OWNER,
    });

    const [newOwnerRef, flamelinkadminRef] = await Promise.all([
      db.collection('users').doc(ownerId).get(),
      db.collection('users').doc(flameLinkOwnerId).get(),
    ]);

    const payload = new CreateNotificationDto();
    payload.token = newOwnerRef.data()?.fcmToken as string[];
    payload.notificationType = NotificationType.INVITE_MEMBER_TEAM;
    payload.receiverId = ownerId;
    payload.senderId = flameLinkOwnerId as string;
    payload.title = `#Zporter added you to be an ${TeamMemberType.OWNER.toLowerCase()} of ${teamName} team`;
    payload.largeIcon =
      process.env.ZPORTER_IMAGE ||
      (flamelinkadminRef.data()?.media?.faceImage as string);
    payload.username = 'Zporter' as string;
    payload.userType = newOwnerRef.data()?.type as UserTypes;
    payload.others = {
      teamId,
      memberType: TeamMemberType.OWNER,
    };

    await notificationsService.sendMulticastNotification(payload);
  });

  await Promise.all([addingOwners]);
};

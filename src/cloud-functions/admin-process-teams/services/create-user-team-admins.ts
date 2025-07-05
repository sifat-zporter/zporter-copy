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

export class CreateUserTeamsAdminsDto {
  adminIds: string[];
  teamId: string;
  flameLinkOwnerId: string;
  teamName: string;
}

export const createUserTeamAdmins = async (
  createUserTeamsAdminsDto: CreateUserTeamsAdminsDto,
) => {
  const { adminIds, teamId, teamName, flameLinkOwnerId } =
    createUserTeamsAdminsDto;

  const addingAdmins = adminIds.map(async (adminId) => {
    await db.collection('users_teams').add({
      teamId: teamId,
      userId: adminId,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      status: JoinTeamStatus.ACCEPTED,
      memberType: TeamMemberType.ADMIN,
    });

    const [newAdminRef, flamelinkadminRef] = await Promise.all([
      db.collection('users').doc(adminId).get(),
      db.collection('users').doc(flameLinkOwnerId).get(),
    ]);

    const payload = new CreateNotificationDto();
    payload.token = newAdminRef.data()?.fcmToken as string[];
    payload.notificationType = NotificationType.INVITE_MEMBER_TEAM;
    payload.receiverId = adminId;
    payload.senderId = flamelinkadminRef.id as string;
    payload.title = `#Zporter added you to be an ${TeamMemberType.ADMIN.toLowerCase()} of ${teamName} team`;
    payload.largeIcon =
      process.env.ZPORTER_IMAGE ||
      (flamelinkadminRef.data()?.media?.faceImage as string);
    payload.username = 'Zporter' as string;
    payload.userType = newAdminRef.data()?.type as UserTypes;
    payload.others = {
      teamId: teamId,
      memberType: TeamMemberType.ADMIN,
    };

    await notificationsService.sendMulticastNotification(payload);
  });

  await Promise.all(addingAdmins);
};

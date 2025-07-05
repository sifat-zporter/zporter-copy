import { db } from '../../../config/firebase.config';
import {
  CreateNotificationDto,
  NotificationType,
} from '../../../modules/notifications/dto/notifications.req.dto';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { UserTypes } from '../../../modules/users/enum/user-types.enum';

const notificationService = new NotificationsService();

class SendRejectNotiCreateTeamDto {
  ownerIds: string[];
  adminId: string;
  rejectMessage: string;
  teamName: string;
  teamId: string;
}

// Send noti to user when admin reject create club
export const sendRejectNotiCreateTeam = async (
  sendRejectNotiCreateTeamDto: SendRejectNotiCreateTeamDto,
) => {
  const { ownerIds, adminId, rejectMessage, teamName, teamId } =
    sendRejectNotiCreateTeamDto;

  const sendNotis = ownerIds.map(async (userId) => {
    const userDoc = await db.collection('users').doc(userId).get();

    const userData = userDoc.data();

    const payload = new CreateNotificationDto();
    payload.token = userData?.fcmToken as string[];
    payload.notificationType = NotificationType.REJECT_CREATE_TEAM;
    payload.receiverId = userId;
    payload.senderId = adminId;
    payload.title = `#Zporter has rejected your request to create team ${teamName} because \n
      ${rejectMessage}. \n
      If you think that was a mistake, please do not hesitate to contact: support@zporter.co`;
    payload.largeIcon = process.env.ZPORTER_IMAGE;
    payload.username = 'Zporter';
    payload.userType = UserTypes.SYS_ADMIN;
    payload.others = {
      teamId,
    };

    await notificationService.sendMulticastNotification(payload);
  });

  await Promise.all(sendNotis);
};

class SendAcceptNotiCreateTeamDto {
  ownerIds: string[];
  adminId: string;
  teamName: string;
  teamId: string;
}

export const sendAcceptNotiCreateTeam = async (
  sendAcceptNotiCreateTeamDto: SendAcceptNotiCreateTeamDto,
) => {
  const { ownerIds, adminId, teamName, teamId } = sendAcceptNotiCreateTeamDto;

  const sendNotis = ownerIds.map(async (userId) => {
    const userDoc = await db.collection('users').doc(userId).get();

    const userData = userDoc.data();

    const payload = new CreateNotificationDto();
    payload.token = userData?.fcmToken as string[];
    payload.notificationType = NotificationType.ACCEPT_CREATE_TEAM;
    payload.receiverId = userId;
    payload.senderId = adminId;
    payload.title = `#Zporter has accepted your request to create team ${teamName}
    Thanks for using Zporter 🧡`;
    payload.largeIcon = process.env.ZPORTER_IMAGE;
    payload.username = 'Zporter';
    payload.userType = UserTypes.SYS_ADMIN;
    payload.others = {
      teamId,
    };

    await notificationService.sendMulticastNotification(payload);
  });

  await Promise.all(sendNotis);
};

import { db } from '../../config/firebase.config';
import {
  CreateNotificationDto,
  NotificationType,
} from '../../modules/notifications/dto/notifications.req.dto';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { UserTypes } from '../../modules/users/enum/user-types.enum';

const notificationService = new NotificationsService();

class SendRejectNotiCreateClubDto {
  userId: string;
  adminId: string;
  rejectMessage: string;
  clubName: string;
}

// Send noti to user when admin reject create club
export const sendRejectNotiCreateClub = async (
  sendNotiCreateClubDto: SendRejectNotiCreateClubDto,
) => {
  const { userId, adminId, rejectMessage, clubName } = sendNotiCreateClubDto;

  const userDoc = await db.collection('users').doc(userId).get();

  const userData = userDoc.data();

  const payload = new CreateNotificationDto();
  payload.token = userData?.fcmToken as string[];
  payload.notificationType = NotificationType.REJECT_CREATE_CLUB;
  payload.receiverId = userId;
  payload.senderId = adminId;
  payload.title = `#Zporter has rejected your request to create club ${clubName} because \n
  ${rejectMessage}. \n
  If you think that was a mistake, please do not hesitate to contact: support@zporter.co`;
  payload.largeIcon = process.env.ZPORTER_IMAGE;
  payload.username = 'Zporter';
  payload.userType = UserTypes.SYS_ADMIN;

  await notificationService.sendMulticastNotification(payload);
};

class SendAcceptNotiCreateClubDto {
  userId: string;
  adminId: string;
  clubName: string;
}

export const sendAcceptNotiCreateClub = async (
  sendAcceptNotiCreateClubDto: SendAcceptNotiCreateClubDto,
) => {
  const { userId, adminId, clubName } = sendAcceptNotiCreateClubDto;

  const userDoc = await db.collection('users').doc(userId).get();

  const userData = userDoc.data();

  const payload = new CreateNotificationDto();
  payload.token = userData?.fcmToken as string[];
  payload.notificationType = NotificationType.ACCEPT_CREATE_CLUB;
  payload.receiverId = userId;
  payload.senderId = adminId;
  payload.title = `#Zporter has accepted your request to create club ${clubName}
  Thanks for using Zporter 🧡`;
  payload.largeIcon = process.env.ZPORTER_IMAGE;
  payload.username = 'Zporter';
  payload.userType = UserTypes.SYS_ADMIN;

  await notificationService.sendMulticastNotification(payload);
};

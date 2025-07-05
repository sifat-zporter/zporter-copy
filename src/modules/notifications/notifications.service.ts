import {
  ForbiddenException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable
} from '@nestjs/common';
import * as firebase from 'firebase-admin';
import { messaging } from 'firebase-admin';
import * as moment from 'moment';
import * as momentTz from 'moment-timezone';
import {
  ResponseMessage,
  ZporterIcon,
} from '../../common/constants/common.constant';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { db, fcm } from '../../config/firebase.config';
import { mappingUserInfoById } from '../../helpers/mapping-user-info';
import { User } from '../users/entities/user.entity';
import { UserTypes } from '../users/enum/user-types.enum';
import { UsersService } from '../users/v1/users.service';
import {
  CreateChatAllNotificationDto,
  CreateNotificationDto,
  DeleteNotificationQuery,
  NotificationTitle,
  NotificationType,
  RegistrationFCMTokenDto,
} from './dto/notifications.req.dto';
import { generateTitleNotification } from './utils/generate-title-notification';
import { getNotificationPayload } from './utils/get-notification-payload';
import { EventTypeFormatted } from '../calendar/enum/event.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private usersService?: UsersService,
  ) { }

  async createRegistrationFCMToken(
    currentUserId: string,
    registrationFCMTokenDto: RegistrationFCMTokenDto,
  ) {
    const { token, timezone } = registrationFCMTokenDto;
    const userRef = await db.collection('users').doc(currentUserId).get();

    userRef.ref.set(
      {
        fcmToken: firebase.firestore.FieldValue.arrayUnion(token),
        timezone,
      },
      { merge: true },
    );

    return ResponseMessage.Notification.CREATED_FCM_TOKEN;
  }

  async removeInvalidToken(invalidToken: string[], currentUserId: string) {
    const userRef = await db.collection('users').doc(currentUserId).get();

    const fcmToken = userRef.data()?.fcmToken as string[];

    if (!fcmToken?.length) {
      return;
    }

    const validToken = fcmToken.filter((e) => !invalidToken.includes(e));

    userRef.ref.set({ fcmToken: validToken }, { merge: true });
  }

  async markAsReadNotifications(currentUserId: string) {
    const unreadNotification = await db
      .collection('notifications')
      .where('receiverId', '==', currentUserId)
      .get();

    if (unreadNotification.empty) {
      return { message: 'All messages are read' };
    }

    const promises = unreadNotification.docs.map((e) => {
      return db.collection('notifications').doc(e.id).update({
        notificationStatus: true,
      });
    });
    await Promise.all(promises);
    return {
      message: 'Success',
    };
  }

  async getListNotifications(
    currentUserId: string,
    paginationDto: PaginationDto,
  ) {
    const { limit, startAfter } = paginationDto;

    let notificationRef = db
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .where('receiverId', '==', currentUserId);

    const unreadNotification = await db
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .where('receiverId', '==', currentUserId)
      .where('notificationStatus', '==', false)
      .get();

    if (startAfter) {
      notificationRef = notificationRef.startAfter(+startAfter).limit(+limit);
    }

    if (!startAfter) {
      notificationRef = notificationRef.limit(+limit);
    }

    const querySnapshot = await notificationRef.get();

    const notificationDocs = querySnapshot.docs;

    const mappingOtherInfos = notificationDocs.map(async (doc) => {
      let result: any = {
        ...doc.data(),
        notificationId: doc.id,
      };

      if (doc.data()?.diaryId) {
        const diariesRef = await db
          .collection('diaries')
          .doc(doc.data()?.diaryId)
          .get();

        if (diariesRef.exists) {
          if (doc.data()?.playerDiaryData) {
            const playerDiaryData = JSON.parse(doc.data()?.playerDiaryData);

            result = {
              ...result,
              playerDiaryData,
            };
          }

          if (doc.data()?.coachDiaryData) {
            const coachDiaryData = JSON.parse(doc.data()?.coachDiaryData);

            result = {
              ...result,
              coachDiaryData,
            };
          }
        } else {
          const { userType } = result;

          userType === UserTypes.COACH
            ? delete result.coachDiaryData
            : delete result.playerDiaryData;
        }
      }

      if (doc.data()?.teamId) {
        const teamRef = await db
          .collection('teams')
          .doc(doc.data()?.teamId)
          .get();

        if (teamRef.exists && doc.data()?.teamInfo) {
          result = {
            ...result,
            teamInfo: JSON.parse(doc.data()?.teamInfo),
          };
        } else {
          delete result.teamInfo;
        }
      }

      if (doc.data()?.devTalkId) {
        const devTalkRef = await db
          .collection('development_talks')
          .doc(doc.data()?.devTalkId)
          .get();

        if (devTalkRef.exists && doc.data()?.developmentNoteData) {
          result = {
            ...result,
            developmentNoteData: devTalkRef.data(),
          };
        } else {
          delete result.developmentNoteData;
        }
      }

      return result;
    });

    const data = await Promise.all(mappingOtherInfos);

    return { data, unreadNotification: unreadNotification.size };
  }

  async checkNotification(currentUserId: string, notificationId: string) {
    const notificationRef = await db
      .collection('notifications')
      .doc(notificationId)
      .get();

    if (!notificationRef.exists) {
      throw new HttpException(
        ResponseMessage.Notification.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (notificationRef.data().receiverId !== currentUserId) {
      throw new HttpException(
        ResponseMessage.Notification.CANNOT_CHECK_NOTIFICATION,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      notificationRef.exists &&
      notificationRef.data().notificationStatus === false
    ) {
      notificationRef.ref.set({ notificationStatus: true }, { merge: true });
    }

    return true;
  }

  async createNotification(payload: messaging.DataMessagePayload) {
    const { body, notificationType, postId } = payload;
    if (notificationType === NotificationType.LIKE_POST) {
      const notificationRef = await db
        .collection('notifications')
        .where('body', '==', body)
        .where('postId', '==', postId)
        .get();

      if (!notificationRef.empty) {
        return;
      }
    }

    const createTime = +moment.utc().format('x');
    const notificationInfo = await db.collection('notifications').add({
      ...payload,
      notificationStatus: false,
      createdAt: createTime,
      updatedAt: createTime,
    });

    return {
      notificationId: notificationInfo.id,
      createdAt: createTime,
    };
  }

  async sendMulticastNotification(
    createNotificationDto: CreateNotificationDto,
    isSaved = true,
  ) {
    const {
      senderId,
      receiverId,
      title = '',
      token,
      notificationType,
      username = '',
      largeIcon,
      bigPicture,
      userType,
      badge = 1,
    } = createNotificationDto;

    let dataMessage = {
      title,
      body: getNotificationPayload(
        notificationType,
        username,
        createNotificationDto?.content,
      ),
      username: username ? username : 'Zporter',
      notificationStatus: 'false',
      notificationType,
      senderId,
      receiverId,
      userType,
    };

    if (largeIcon) {
      dataMessage['largeIcon'] = largeIcon
        ? largeIcon
        : process.env.DEFAULT_IMAGE;
    }

    if (bigPicture) {
      dataMessage['bigPicture'] = bigPicture
        ? bigPicture
        : process.env.DEFAULT_IMAGE;
    }
    console.log('dataMessage', dataMessage);

    const payload = {
      tokens: token as string[],
      data: <messaging.DataMessagePayload>{
        ...dataMessage,
      },
      notification: <messaging.NotificationMessagePayload>{
        title,
        body: getNotificationPayload(
          notificationType,
          username,
          createNotificationDto?.content,
        ),
      },
      android: <messaging.AndroidConfig>{
        notification: {
          imageUrl: largeIcon ? largeIcon : process.env.DEFAULT_IMAGE,
        },
        priority: 'high',
      },
      apns: <messaging.ApnsConfig>{
        headers: {
          'apns-priority': '5',
        },
        payload: <messaging.ApnsPayload>{
          aps: <messaging.Aps>{
            alert: <messaging.ApsAlert>{
              launchImage: largeIcon ? largeIcon : process.env.DEFAULT_IMAGE,
            },
            badge: badge,
            sound: <messaging.CriticalSound>{
              critical: true,
              name: 'default',
              volume: 1.0,
            },
          },
        },
        fcmOptions: <messaging.ApnsFcmOptions>{
          imageUrl: largeIcon ? largeIcon : process.env.DEFAULT_IMAGE,
        },
      },
      webpush: <messaging.WebpushConfig>{
        fcmOptions: <messaging.WebpushFcmOptions>{
          link: process.env.WEB_BASE_URL,
        },
      },
    };
    console.log('payload', payload);
    if (createNotificationDto?.others) {
      console.log('createNotificationDto.others', createNotificationDto?.others);
      dataMessage = { ...dataMessage, ...createNotificationDto?.others };

      payload.data = {
        ...dataMessage,
      };
    }

    if (isSaved) {
      console.log('isSaved', isSaved);
      const data = await this.createNotification(
        payload.data as messaging.DataMessagePayload,
      );

      if (!data?.notificationId) {
        return;
      }

      dataMessage['notificationId'] = data?.notificationId;
      dataMessage['createdAt'] = data?.createdAt.toString();

      payload.data = { ...dataMessage };
    }
    console.debug('payload', payload);
    if (payload?.tokens?.length) {
      try {
        const result = await fcm.sendEachForMulticast(payload);

        const failedToken: string[] = [];
        result.responses.forEach((res, idx) => {
          if (res.error) {
            failedToken.push(token[idx]);
          }
        });
        this.removeInvalidToken(failedToken, receiverId as string);
      } catch (error) {
        console.debug('sendMulticastNotification error: ', error);
      }
    }
  }

  async chatAll(
    currentUserId: string,
    createChatAllNotificationDto: CreateChatAllNotificationDto,
  ) {
    try {
      const { content, link, others } = createChatAllNotificationDto;
      const notificationType = NotificationType.SEND_ALL_FROM_ADMIN;

      const userIds = await this.usersService.getListUsersForAdmin(
        currentUserId,
      );
      await Promise.all(
        userIds.map(({ userId, userType, username }) => {
          let dataMessage = {
            title: NotificationTitle.ZPORTER_ADMIN_MESSAGE,
            body: getNotificationPayload(notificationType),
            username: username ? username : 'Zporter',
            notificationStatus: 'false',
            notificationType,
            senderId: currentUserId,
            receiverId: userId,
            userType,
            content,
            link,
            largeIcon: ZporterIcon.BLACK_ICON,
            bigPicture: ZporterIcon.BLACK_ICON,
            ...others,
          };

          return this.createNotification(dataMessage);
        }),
      );
      return 'Successfully';
    } catch (error) {
      throw new ForbiddenException('Resource');
    }
  }

  async subscribeTopic(
    tokens: string[],
    topicName: string,
    currentUserId: string,
  ) {
    const topicRef = await db
      .collection('topics')
      .where('name', '==', topicName)
      .get();

    if (topicRef.empty) {
      await db.collection('topics').add({
        name: topicName,
        userIds: firebase.firestore.FieldValue.arrayUnion(currentUserId),
        createdAt: +moment.utc().format('x'),
        updatedAt: +moment.utc().format('x'),
      });
    }

    topicRef.forEach((doc) => {
      doc.ref.set(
        {
          userIds: firebase.firestore.FieldValue.arrayUnion(currentUserId),
          updatedAt: +moment.utc().format('x'),
        },
        { merge: true },
      );
    });

    if (tokens.length) {
      return fcm.subscribeToTopic(tokens, topicName);
    }
  }

  async unSubscribeTopic(
    tokens: string[],
    topicName: string,
    currentUserId: string,
  ) {
    const topicRef = await db
      .collection('topics')
      .where('name', '==', topicName)
      .get();

    if (!topicRef.empty) {
      topicRef.forEach((doc) => {
        doc.ref.set(
          {
            userIds: firebase.firestore.FieldValue.arrayRemove(currentUserId),
            updatedAt: +moment.utc().format('x'),
          },
          { merge: true },
        );
      });
    }

    if (tokens.length) {
      return fcm.unsubscribeFromTopic(tokens, topicName);
    }
  }

  async sendToTopic(
    createNotificationDto: CreateNotificationDto,
    isSaved = true,
  ) {
    const {
      senderId,
      receiverId,
      title = '',
      notificationType,
      username = '',
      largeIcon,
      bigPicture,
      topic,
      userType,
      badge = 1,
    } = createNotificationDto;

    let dataMessage = {
      title,
      body: getNotificationPayload(
        notificationType,
        username,
        createNotificationDto?.content,
      ),
      username: username ? username : 'Zporter',
      notificationStatus: 'false',
      notificationType,
      senderId,
      receiverId,
      userType,
    };

    if (largeIcon) {
      dataMessage['largeIcon'] = largeIcon;
    }

    if (bigPicture) {
      dataMessage['bigPicture'] = bigPicture;
    }

    const payload = {
      data: <messaging.DataMessagePayload>{
        ...dataMessage,
      },
      notification: <messaging.NotificationMessagePayload>{
        title,
        body: getNotificationPayload(
          notificationType,
          username,
          createNotificationDto?.content,
        ),
      },
      topic: topic,
      android: <messaging.AndroidConfig>{
        notification: {
          imageUrl: largeIcon,
        },
        priority: 'high',
      },
      apns: <messaging.ApnsConfig>{
        headers: {
          'apns-priority': '5',
        },
        payload: <messaging.ApnsPayload>{
          aps: <messaging.Aps>{
            alert: <messaging.ApsAlert>{
              launchImage: largeIcon,
            },
            badge: badge,
            sound: <messaging.CriticalSound>{
              critical: true,
              name: 'default',
              volume: 1.0,
            },
          },
        },
        fcmOptions: <messaging.ApnsFcmOptions>{
          imageUrl: largeIcon,
        },
      },
      webpush: <messaging.WebpushConfig>{
        fcmOptions: <messaging.WebpushFcmOptions>{
          link: process.env.WEB_BASE_URL,
        },
      },
    };

    if (createNotificationDto?.others) {
      dataMessage = { ...dataMessage, ...createNotificationDto?.others };

      payload.data = {
        ...dataMessage,
      };
    }

    if (isSaved) {
      const topicRef = await db
        .collection('topics')
        .where('name', '==', payload.topic)
        .get();

      const receiverIds: string[] = [];

      topicRef.forEach((doc) => {
        const { userIds = [] } = doc.data();
        if (userIds.length) {
          userIds.forEach((userId: string) => {
            if (userId !== senderId) {
              receiverIds.push(userId);
            }
          });
        }
      });

      if (receiverIds.length) {
        const savingNotifications = receiverIds.map(async (receiverId) => {
          payload.data = {
            ...payload.data,
            receiverId,
          };

          await this.createNotification(
            payload.data as messaging.DataMessagePayload,
          );
        });

        await Promise.all(savingNotifications);
      }
    }

    return fcm.send(payload);
  }

  async deleteNotification(
    currentUserId: string,
    deleteNotificationQuery: DeleteNotificationQuery,
  ) {
    const { notificationId } = deleteNotificationQuery;

    if (notificationId) {
      const notiRef = await db
        .collection('notifications')
        .doc(notificationId)
        .get();

      if (!notiRef.exists) {
        throw new HttpException(
          ResponseMessage.Notification.NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }

      if (notiRef.data().receiverId !== currentUserId) {
        throw new HttpException(
          ResponseMessage.Notification.CANNOT_DELETE_NOTIFICATION,
          HttpStatus.BAD_REQUEST,
        );
      }

      notiRef.ref.delete();

      return ResponseMessage.Notification.DELETE_NOTIFICATION;
    }

    const notiRef = await db
      .collection('notifications')
      .where('receiverId', '==', currentUserId)
      .get();

    notiRef.forEach((doc) => {
      doc.ref.delete();
    });

    return ResponseMessage.Notification.DELETE_NOTIFICATION;
  }

  async noticeChangedStatusInUsersTeams<
    T extends {
      notificationType: NotificationType;
      senderId: string;
      receiverId: string;
      teamId: string;
    },
  >(noticeInfo: T) {
    const payload: CreateNotificationDto =
      await this.generateCreateNotificationDto({
        notificationType: noticeInfo.notificationType,
        senderId: noticeInfo.senderId,
        receiverId: noticeInfo.receiverId,
        others: { teamId: noticeInfo.teamId },
      });

    await this.sendMulticastNotification(payload);
  }

  async noticeBlockMemberInTeam<
    T extends { [key: string]: any },
    U extends {
      notificationType: NotificationType;
      senderId: string;
      receiverId: string;
      others: T;
      teamName?: string;
    },
  >(blockInfor: U) {
    const payload: CreateNotificationDto =
      await this.generateCreateNotificationDto(blockInfor);
    payload.content = blockInfor.teamName;

    await this.sendMulticastNotification(payload);
  }

  async eventParticipants(event: any, participants: User[], notificationType: NotificationType, content?: string, statusUpdate?: Boolean): Promise<void> {
    const { title, organizerId, startDate, organizerFaceImage } = event;
    const eventStartDate = new Date(startDate);
    const eventType = EventTypeFormatted[event?.type];
    const addNotifications = participants.map(async (participant: any) => {
      const { userId, type, fcmToken, message, timezone, username } = participant;
      console.debug('eventParticipants', fcmToken);
      const eventDate = momentTz(eventStartDate).tz(timezone).format('D MMM');
      const eventTime = momentTz(eventStartDate).tz(timezone).format('HH:mm');

      if (participant?.settings?.notificationOn && participant?.settings?.notificationOptions?.inviteUpdates) {
        const payload = new CreateNotificationDto();
        payload.title = notificationType == NotificationType.EVENT_INVITATION_UPDATE ? `Participant Status Update` : `Invite to Team ${eventType || ''} ${eventDate} at ${eventTime}`;
        payload.senderId = notificationType == NotificationType.EVENT_INVITATION_UPDATE ? userId : organizerId;
        payload.receiverId = notificationType == NotificationType.EVENT_INVITATION_UPDATE ? organizerId : userId;
        payload.token = fcmToken || [];
        payload.notificationType = notificationType;
        payload.userType = type || 'PLAYER';
        payload.content = statusUpdate ? message : content;
        payload.largeIcon = organizerFaceImage || '';
        payload.others = { eventId: event?.id };
        await this.sendMulticastNotification(payload);
      }
    })
    await Promise.all(addNotifications);
  }

  async eventInvitation(notifications: [{ senderId: string, receiverId: string, token: [], title: string, notificationType: NotificationType, userType: string, content: string, others: any }]): Promise<void> {
    const addNotifications = notifications.map(async (data: any, index: Number) => {
      const { senderId, receiverId, token, title, notificationType, type, content, others } = data;
      const payload = new CreateNotificationDto();
      payload.senderId = senderId;
      payload.receiverId = receiverId;
      payload.token = token || [];
      payload.title = title;
      payload.notificationType = notificationType;
      payload.userType = type || 'PLAYER';
      payload.content = content;
      payload.others = others;
      await this.sendMulticastNotification(payload);
    })
    await Promise.all(addNotifications);
  }

  async generateCreateNotificationDto<
    T extends { [key: string]: any },
    U extends {
      notificationType: NotificationType;
      senderId: string;
      receiverId: string;
      others: T;
    },
  >(infor: U): Promise<CreateNotificationDto> {
    const currentUserInfo = await mappingUserInfoById(infor.senderId);

    const payload = new CreateNotificationDto();

    payload.notificationType = infor.notificationType;
    payload.senderId = infor.senderId;
    payload.receiverId = infor.receiverId;
    payload.largeIcon = currentUserInfo.faceImage as string;
    payload.username = currentUserInfo.username as string;
    payload.userType = currentUserInfo.type as UserTypes;
    payload.token = currentUserInfo.fcmToken;
    payload.others = infor.others;

    payload.title = generateTitleNotification(infor.notificationType);
    return payload;
  }
}

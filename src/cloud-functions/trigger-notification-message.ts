import * as functions from 'firebase-functions';
import { EventContext } from 'firebase-functions';
import { DataSnapshot } from 'firebase-functions/v1/database';
import { fb } from '../config/firebase.config';
import { mappingUserInfoById } from '../helpers/mapping-user-info';
import {
  CreateNotificationDto,
  NotificationType,
} from '../modules/notifications/dto/notifications.req.dto';
import { NotificationsService } from '../modules/notifications/notifications.service';

enum MessageTypes {
  FILE = 'file',
  IMAGE = 'image',
  VIDEO = 'video',
  TEXT = 'text',
  CUSTOM = 'custom',
}

const mappingMessageByType = (
  messageType: MessageTypes,
  originalMessage?: string,
  username?: string,
  isGroup = false,
) => {
  const messageTypes = [
    {
      type: MessageTypes.FILE || MessageTypes.CUSTOM,
      message: `#${username} sent you an attach file`,
    },
    {
      type: MessageTypes.IMAGE,
      message: `#${username} sent you an image`,
    },
    {
      type: MessageTypes.TEXT,
      message: isGroup ? `#${username}: ${originalMessage}` : originalMessage,
    },
    {
      type: MessageTypes.VIDEO,
      message: `#${username} sent you a video`,
    },
  ];

  return messageTypes.find(({ type }) => type === messageType).message;
};

const notificationService = new NotificationsService();

export const triggerOnCreateNotificationMessages = functions
  .region(process.env.REGION)
  .database.ref('chatMessages/{roomId}/{messageId}')
  .onCreate(async (snapshot: DataSnapshot, context: EventContext) => {
    const roomId = context.params.roomId;
    const messageId = context.params.messageId;

    const chatMessagesRef = await fb
      .ref(`chatMessages/${roomId}/${messageId}`)
      .get();

    const totalMessageInRoom = await fb.ref(`chatMessages/${roomId}`).get();

    const chatRoomRef = await fb.ref(`chatRooms/${roomId}`).get();

    const memberIds = chatRoomRef.val()?.memberIds as string[];

    const createdByRef = await mappingUserInfoById(
      chatMessagesRef.val()?.createdBy,
    );

    if (memberIds?.length) {
      let excludeUIDsGetNotification = [
        ...(chatRoomRef.val()?.chattingUIDs || []),
        chatMessagesRef.val()?.createdBy,
        ...(chatRoomRef.val()?.blockedByUIDs || []),
      ];

      if (
        chatRoomRef.val()?.requested === true &&
        totalMessageInRoom.numChildren() > 1
      ) {
        const memberIds = chatRoomRef.val()?.memberIds;
        const excludeUserIds = memberIds.filter(
          (memberId) => memberId !== chatRoomRef.val()?.requestedUID,
        );

        excludeUIDsGetNotification = [
          ...excludeUIDsGetNotification,
          ...excludeUserIds,
        ];
      }

      const intersection = memberIds.filter((e) => {
        return excludeUIDsGetNotification.indexOf(e) < 0;
      });

      const sendingNotifications = intersection.map(async (memberId) => {
        const payload = new CreateNotificationDto();

        const [
          {
            fcmToken,
            notificationOptions: { messageUpdates },
          },
          countUnreadMessage,
        ] = await Promise.all([
          mappingUserInfoById(memberId),
          countUnreadMessages(memberId),
        ]);

        if (messageUpdates) {
          const originalMessage = chatMessagesRef.val()?.text || null;

          const isGroup = chatRoomRef.val()?.isGroup;

          const messageType = chatMessagesRef.val()?.type;
          payload.token = fcmToken;
          payload.content = mappingMessageByType(
            messageType,
            originalMessage,
            createdByRef.username,
            isGroup,
          );
          payload.title = `#${createdByRef.username}`;
          payload.notificationType = NotificationType.SEND_MESSAGE;
          payload.userType = createdByRef.type;
          payload.largeIcon = createdByRef.faceImage;
          payload.bigPicture = createdByRef.faceImage;
          payload.senderId = createdByRef.userId;
          payload.receiverId = memberId;
          payload.badge = countUnreadMessage;
          payload.others = {
            chatRoomId: chatRoomRef.val()?.chatRoomId,
          };

          if (chatRoomRef.val()?.isGroup) {
            payload.title = chatRoomRef.val()?.chatRoomName;
          }

          await notificationService.sendMulticastNotification(payload, false);
        }
      });

      await Promise.all(sendingNotifications);
    }
  });

const countUnreadMessages = async (currentUserId: string) => {
  const chatRoomRef = await fb.ref(`chatRooms`).get();

  const ownChatRoomIds = [];

  chatRoomRef.forEach((doc) => {
    const { memberIds = [], deletedAt = null, blockedByUIDs = [] } = doc.val();

    if (
      memberIds.includes(currentUserId) &&
      !blockedByUIDs.includes(currentUserId)
    ) {
      ownChatRoomIds.push({
        roomId: doc.key,
        deletedAt: deletedAt && deletedAt[currentUserId],
      });
    }
  });

  let countUnreadMessages = 0;

  const countUnreadMessage = ownChatRoomIds.map(
    async ({ roomId, deletedAt }) => {
      let chatMessagesRef;

      if (deletedAt) {
        chatMessagesRef = await fb
          .ref(`chatMessages/${roomId}`)
          .startAfter(deletedAt)
          .get();
      } else {
        chatMessagesRef = await fb.ref(`chatMessages/${roomId}`).get();
      }

      chatMessagesRef.forEach((doc) => {
        const { seenMessageUIds = [], createdBy } = doc.val();

        if (
          !seenMessageUIds?.includes(currentUserId) &&
          createdBy !== currentUserId
        ) {
          countUnreadMessages++;
        }
      });
    },
  );

  await Promise.all(countUnreadMessage);

  return countUnreadMessages;
};

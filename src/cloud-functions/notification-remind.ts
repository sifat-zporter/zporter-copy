import * as functions from 'firebase-functions';
import * as moment from 'moment';
import { mappingUserInfoById } from '../helpers/mapping-user-info';
import {
  SynchronizePostDto,
  TypeOfPost,
} from '../modules/feed/dto/feed.req.dto';
import { NotificationTitle } from '../modules/notifications/dto/notifications.req.dto';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { UserTypes } from '../modules/users/enum/user-types.enum';
import { getContentByFrequencyUpdateDiary } from '../utils/get-content-by-frequency-update-diary';
import { db } from './../config/firebase.config';
import {
  CreateNotificationDto,
  NotificationType,
} from './../modules/notifications/dto/notifications.req.dto';
import axios from 'axios';

// 72h Notification reminder of not updated Diary
export const sendNotificationRemind = functions
  .region(process.env.REGION)
  .pubsub.schedule('0 0 */1 * *')
  .onRun(async () => {
    const notificationService = new NotificationsService();
    const from = +moment.utc().startOf('day').subtract(4, 'day').format('x');
    const to = +moment.utc().endOf('day').subtract(1, 'day').format('x');

    const userRef = await db
      .collection('users')
      .where('account.isActive', '==', true)
      .get();

    const userDocs = userRef.docs;

    if (userDocs.length) {
      const checkDiariesExistAndRemind = userDocs.map(async (doc) => {
        const userId = doc.id;
        const userInfo = await mappingUserInfoById(userId);

        const diaryRef = await db
          .collection('diaries')
          .where('userId', '==', userId)
          .where('createdAt', '>=', from)
          .where('createdAt', '<=', to)
          .get();

        if (!diaryRef.empty) {
          return;
        }

        const checkNotificationExists = await db
          .collection('notifications')
          .where(
            'notificationType',
            '==',
            NotificationType.REMIND_ON_DIARY_UPDATE,
          )
          .where('receiverId', '==', userId)
          .where('createdAt', '>=', from)
          .where('createdAt', '<=', to)
          .orderBy('createdAt', 'desc')
          .get();

        const lastDayNotification =
          (checkNotificationExists.docs[0]?.data()?.body as string)?.split(
            'd',
          )[0] || 0;

        const payload = new CreateNotificationDto();

        const defaultDayRemind = 3;

        const content =
          lastDayNotification > 0
            ? (+lastDayNotification + 1).toString()
            : defaultDayRemind.toString();

        payload.title = NotificationTitle.ZPORTER_DIARY;
        payload.username = 'Zporter';
        payload.token = userInfo.fcmToken;
        payload.senderId = '';
        payload.notificationType = NotificationType.REMIND_ON_DIARY_UPDATE;
        payload.receiverId = userId;
        payload.largeIcon = process.env.ZPORTER_IMAGE;
        payload.userType = UserTypes.SYS_ADMIN;
        payload.content = content;

        if (
          diaryRef.empty &&
          userInfo.notificationOptions.profileAndDiaryUpdates
        ) {
          await notificationService.sendMulticastNotification(payload);
        }

        let i = 6;

        const last7Days = [];

        while (i >= 0) {
          last7Days.push({
            from: +moment.utc().startOf('day').subtract(i, 'day').format('x'),
            to: +moment.utc().endOf('day').subtract(i, 'day').format('x'),
          });
          i--;
        }

        const checkFrequencyUpdateDiary = last7Days.map(
          async ({ from, to }) => {
            const diariesRef = await db
              .collection('diaries')
              .orderBy('createdAt', 'desc')
              .where('userId', '==', userId)
              .where('createdAt', '>=', from)
              .where('createdAt', '<=', to)
              .get();

            const typeOfDiary = diariesRef.docs[0]?.data()?.typeOfDiary || null;

            return {
              day: from,
              type:
                typeOfDiary === 'TRAINING'
                  ? diariesRef.docs[0]?.data()?.training?.typeOfTraining
                  : typeOfDiary,
            };
          },
        );

        const data = await Promise.all(checkFrequencyUpdateDiary);

        let countFrequencyUpdateDiary = 0;

        data.forEach(({ type }) => {
          if (type !== null) {
            countFrequencyUpdateDiary++;
          }
        });

        const notiRemindUpdateDiariesRef = await db
          .collection('remind_update_diaries')
          .orderBy('createdAt', 'desc')
          .where('userId', '==', userId)
          .get();

        const synchronizePostDto = new SynchronizePostDto();

        synchronizePostDto.typeOfPost = TypeOfPost.REMIND_UPDATE_DIARIES;

        if (notiRemindUpdateDiariesRef?.docs[0].exists) {
          notiRemindUpdateDiariesRef?.docs[0].ref.set(
            {
              data,
              userId,
              content: getContentByFrequencyUpdateDiary(
                countFrequencyUpdateDiary,
              ),
              createdAt: +moment.utc().format('x'),
              updatedAt: +moment.utc().format('x'),
              typeOfPost: TypeOfPost.REMIND_UPDATE_DIARIES,
            },
            { merge: true },
          );

          synchronizePostDto.postId = notiRemindUpdateDiariesRef.docs[0].id;
        } else {
          const newRemindPost = await db
            .collection('remind_update_diaries')
            .add({
              data,
              userId,
              content: getContentByFrequencyUpdateDiary(
                countFrequencyUpdateDiary,
              ),
              createdAt: +moment.utc().format('x'),
              updatedAt: +moment.utc().format('x'),
              typeOfPost: TypeOfPost.REMIND_UPDATE_DIARIES,
            });

          synchronizePostDto.postId = newRemindPost.id;
        }

        await axios.post(
          `${process.env.BACKEND_URL}/feed/synchronize-posts-to-mongoose
          `,
          { ...synchronizePostDto, priority: 1 },
          { headers: { roleId: userId } },
        );
      });

      await Promise.all(checkDiariesExistAndRemind);
    }

    return 'success';
  });

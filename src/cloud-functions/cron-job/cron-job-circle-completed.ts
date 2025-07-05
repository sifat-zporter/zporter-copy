import * as functions from 'firebase-functions';
import * as moment from 'moment';
import { db } from '../../config/firebase.config';

class UserCircleCompleted {
  userId: string;
  circleCompleted: number;
}

export const calculateCircleCompleted = functions
  .region(process.env.REGION)
  .pubsub.schedule('0 0 * * *')
  .timeZone(process.env.DEFAULT_TIMEZONE)
  .onRun(async () => {
    const startOfYesterday = +moment
      .utc()
      .startOf('day')
      .subtract(1, 'day')
      .format('x');
    const endOfYesterday = +moment
      .utc()
      .endOf('day')
      .subtract(1, 'day')
      .format('x');

    try {
      const userRef = await db
        .collection('users')
        .where('account.isActive', '==', true)
        .get();

      const users: UserCircleCompleted[] = [];

      userRef.forEach((doc) => {
        users.push({
          circleCompleted: doc.data()?.circleCompleted,
          userId: doc.id,
        });
      });

      const updateUserCircleComplete = users.map(
        async ({ circleCompleted, userId }) => {
          const userDiaryRefInADay = await db
            .collection('diaries')
            .where('userId', '==', userId)
            .where('createdAt', '>=', startOfYesterday)
            .where('createdAt', '<=', endOfYesterday)
            .get();

          if (userDiaryRefInADay.empty) {
            if (circleCompleted > 50) {
              circleCompleted -= 5;
            } else {
              // make sure it always be 50
              circleCompleted = 50;
            }
          }

          if (!userDiaryRefInADay.empty && circleCompleted < 100) {
            circleCompleted += 5;
          }

          await db
            .collection('users')
            .doc(userId)
            .set({ circleCompleted: circleCompleted }, { merge: true });
        },
      );

      await Promise.all(updateUserCircleComplete);
    } catch (error) {
      console.log(error);
    }
  });

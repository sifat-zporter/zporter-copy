import axios from 'axios';
import * as functions from 'firebase-functions';

export const remindPlayersUpdateDiaries = functions
  .region(process.env.REGION)
  .pubsub.schedule('0 2 */1 * *')
  .timeZone(process.env.DEFAULT_TIMEZONE)
  .onRun(async () => {
    axios
      .get(
        `${process.env.BACKEND_URL}/schedules/remind-all-the-players-update-diaries`,
        {
          headers: { secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64')  },
        },
      )
      .then((result) => console.log('Success'))
      .catch((error) => console.log(error));
  });

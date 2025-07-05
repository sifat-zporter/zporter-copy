import axios from 'axios';
import * as functions from 'firebase-functions';

export const getPlayerOfTheWeek = functions
  .region(process.env.REGION)
  .pubsub.schedule('0 1 * * WED')
  .timeZone(process.env.DEFAULT_TIMEZONE)
  .onRun(async () => {
    axios
      .get(`${process.env.BACKEND_URL}/schedules/get-player-of-the-week`, {
        headers: { secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64')  },
      })
      .then((result) => console.log('Success'))
      .catch((error) => console.log(error));
  });

import axios from 'axios';
import * as functions from 'firebase-functions';

export const monthlySendMailLeaderBoard = functions
  .region(process.env.REGION)
  .pubsub.schedule('0 12 31 12 *') // Runs on the 1st of every month at 12:00 PM
  .timeZone(process.env.DEFAULT_TIMEZONE)
  .onRun(async () => {
    axios
      .get(
        `${process.env.BACKEND_URL}/schedules/yearly-sponsor-payment`,
        {
          headers: { secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64') },
        },
      )
      .then(() => console.log('Success'))
      .catch((error) => console.log(error));
  });

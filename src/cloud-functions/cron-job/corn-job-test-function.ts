import axios from 'axios';
import * as functions from 'firebase-functions';

export const pingEveryMinute = functions
  .region(process.env.REGION)
  .pubsub.schedule('* * * * *') // every minute
  .timeZone(process.env.DEFAULT_TIMEZONE)
  .onRun(async () => {
    try {
      await axios.get(
        `${process.env.BACKEND_URL}/schedules/caculate-player-avg-radar`,
        {
          headers: {
            secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64'),
          },
        },
      );
      console.log('Success');
    } catch (error) {
      console.error('Error:', error);
    }
  });

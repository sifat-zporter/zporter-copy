import axios from 'axios';
import * as functions from 'firebase-functions';

export const getTheWinnerFantazyManagerOfTheWeek = functions
  .region(process.env.REGION)
  .pubsub.schedule('0 16 * * TUE')
  .timeZone(process.env.DEFAULT_TIMEZONE)
  .onRun(async () => {
    axios
      .get(
        `${process.env.BACKEND_URL}/schedules/get-the-winner-fantazy-team-of-the-week`,
        {
          headers: {
            secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64'),
          },
        },
      )
      .then(() => console.log('success.'))
      .catch((err) => console.log(err));
  });

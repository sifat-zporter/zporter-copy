import axios from 'axios';
import * as functions from 'firebase-functions';

export const createDreamTeam = functions
  .region(process.env.REGION)
  .pubsub.schedule('0 15 * * TUE')
  .timeZone(process.env.DEFAULT_TIMEZONE)
  .onRun(async () => {
    axios
      .get(`${process.env.BACKEND_URL}/schedules/create-dream-team-v4`, {
        headers: { secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64')  },
      })
      .then((result) => console.log('Success'))
      .catch((error) => console.log(error));
  });

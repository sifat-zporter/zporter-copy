import axios from 'axios';
import * as functions from 'firebase-functions';

export const calculatePlayerInHowManyFantazyTeam = functions
  .region(process.env.REGION)
  .pubsub.schedule('0 9 * * SAT')
  .timeZone(process.env.DEFAULT_TIMEZONE)
  .onRun(async () => {
    axios
      .get(`${process.env.BACKEND_URL}/schedules/player-in-how-many-team`, {
        headers: { secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64')  },
      })
      .then((result) => console.log('Success'))
      .catch((error) => console.log(error));
  });

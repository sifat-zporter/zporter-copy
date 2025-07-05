import axios from 'axios';
import * as functions from 'firebase-functions';

export const caculatePlayerAvgRadar = functions
  .region(process.env.REGION)
  .pubsub.schedule('1 0 * * *')
  .timeZone(process.env.DEFAULT_TIMEZONE)
  .onRun(async () => {
    axios
      .get(`${process.env.BACKEND_URL}/schedules/caculate-player-avg-radar`, {
        headers: { secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64')  },
      })
      .then((result) => console.log('Success'))
      .catch((error) => {
        console.log(error);
      });
  });

import * as functions from 'firebase-functions';
import axios from 'axios';

export const preventColdStartMode = functions
  .region(process.env.REGION)
  .pubsub.schedule('*/1 * * * *')
  .timeZone(process.env.DEFAULT_TIMEZONE)
  .onRun(async () => {
    const apiDev = axios.get(`https://dev.api.zporter.co/`);
    const apiStg = axios.get(`https://stg.api.zporter.co/`);
    const webDev = axios.get(`https://dev.web.zporter.co/`);
    const webStg = axios.get(`https://zporter.co/`);
    await Promise.all([apiDev, apiStg, webDev, webStg]);
  });

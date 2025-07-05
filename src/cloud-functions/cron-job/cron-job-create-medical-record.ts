import axios from 'axios';
import * as functions from 'firebase-functions';

// Run at 2:02 AM daily
export const runMedicalUpdate = functions
    .region(process.env.REGION)
    .pubsub.schedule('59 22 * * * ') // At 2:02 AM every day (minutes hours day-of-month month day-of-week)
    .timeZone(process.env.DEFAULT_TIMEZONE)
    .onRun(async () => {
        try {
            const response = await axios.get(`${process.env.BACKEND_URL}/schedules/medical-update`, {
                headers: {
                    secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64'),
                },
            });

            console.log('Medical update request sent successfully:', response.data);
            return null;
        } catch (error) {
            console.error('Failed to send medical update request:', error.message);
            if (error.response) {
                console.error('Error response status:', error.response.status);
                console.error('Error response data:', error.response.data);
            }
            return null;
        }
    });
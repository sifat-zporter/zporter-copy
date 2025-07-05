import * as functions from 'firebase-functions';
import * as firebase from 'firebase-admin';

export const backupDataFirebase = functions
  .region(process.env.REGION)
  .pubsub.schedule('45 */3 * * *')
  .timeZone(process.env.DEFAULT_TIMEZONE)
  .onRun(async () => {
    const client = new firebase.firestore.v1.FirestoreAdminClient();
    const bucket = process.env.FB_BACKUP_BUCKET;
    const databaseName = client.databasePath(
      process.env.FB_PROJECT_ID,
      '(default)',
    );
		
    return client
      .exportDocuments({
        name: databaseName,
        outputUriPrefix: bucket,
        // Leave collectionIds empty to export all collections
        // or set to a list of collection IDs to export,
        collectionIds: [],
      })
      .then((responses) => {
        const response = responses[0];
        console.log(`Operation Name: ${response['name']}`);
      })
      .catch((err) => {
        console.error(err);
        throw new Error('Export operation failed');
      });
  });

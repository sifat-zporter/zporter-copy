import axios from 'axios';
import * as functions from 'firebase-functions';
import { elasticClient } from '../config/elastic.config';

export const updateTagIndex = functions
  .region(process.env.REGION)
  .firestore.document('tags/{tagId}')
  .onWrite(async (change, context) => {
    const newTagData = change.after.data();

    // Use the 'tagId' path segment as the identifier for Elastic
    const id = context.params.tagId;

    // Get index name as lowercase string
    // const index = oldTagData.type.toLowerCase();

    if (newTagData) {
      await elasticClient.index({
        index: newTagData.type.toLowerCase(),
        id,
        body: newTagData,
      });
    }
  });

export const updateTagsToMongo = functions
  .region(process.env.REGION)
  .firestore.document('tags/{tagId}')
  .onUpdate(async (change, context) => {
    try {
      const tag = change.after.data();
      const id = context.params.tagId;
      console.log('update data for tagId: ', id);

      console.log(
        'sync successfully to ',
        `${process.env.BACKEND_URL}/tags/sync-tags-to-mongo`,
      );
      axios.post(
        `${process.env.BACKEND_URL}/tags/sync-tags-to-mongo`,
        { ...tag, tagId: id },
        {
          headers: {
            secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64'),
            tagId: id,
          },
        },
      )
      .then(() => console.log('success #id: ', id))
      .catch(err => console.log(err))
      
    } catch (error) {
      if (error.meta.statusCode === 404) {
        console.log('get error when update user from firebase to mongo');
      }
    }
  });

import * as functions from 'firebase-functions';
import { db } from '../config/firebase.config';

export const aggregateInjury = functions
  .region(process.env.REGION)
  .firestore.document('diaries/{diaryId}/injuries/{injuryId}')
  .onWrite(async (change, context) => {
    const diaryId = context.params.diaryId;

    // ref to the parent document
    const diaryRef = db.collection('diaries').doc(diaryId);

    if (!(await diaryRef.get()).data()) {
      return;
    }

    const injuryRef = await diaryRef
      .collection('injuries')
      .orderBy('createdAt', 'asc')
      .get();

    const injuriesData = [];
    injuryRef.forEach((doc) => {
      injuriesData.push({ ...doc.data(), injuryId: doc.id, diaryId: diaryId });
    });

    await diaryRef.update({ injuries: injuriesData });
    return 'Success';
  });

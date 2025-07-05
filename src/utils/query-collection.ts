import * as firebase from 'firebase-admin';
import { db } from '../config/firebase.config';

export const collection = (
  collectionName: string,
): firebase.firestore.Query<firebase.firestore.DocumentData> => {
  return db.collection(collectionName);
};

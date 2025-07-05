import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { db } from '../config/firebase.config';

const incrementEngagement = async (
    userId: string,
    type: 'friends' | 'follows' | 'views'
) => {
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
        engagement: {
            [type]: admin.firestore.FieldValue.increment(1)
        }
    }, { merge: true });
};

export const onFriendAdded = functions.firestore
    .document('friends/{friendId}')
    .onUpdate(async (change) => {
        const before = change.before.data();
        const after = change.after.data();

        if (before?.status !== 'accepted' && after?.status === 'accepted') {
            if (typeof after.userId === 'string') {
                await incrementEngagement(after.userId, 'friends');
            }
        }
    });

export const onFollowAdded = functions.firestore
    .document('follows/{followId}')
        .onUpdate(async (change) => {
        const before = change.before.data();
        const after = change.after.data();

        if (before?.status !== 'accepted' && after?.status === 'accepted') {
            if (typeof after.userId === 'string') {
                await incrementEngagement(after.userId, 'follows');
            }
        }
    });

export const onViewBiography = functions.firestore
    .document('view_biographies/{viewId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        if (data?.guestId) {
            await incrementEngagement(data.guestId, 'views');
        }
    });

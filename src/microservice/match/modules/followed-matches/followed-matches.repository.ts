import { Injectable } from '@nestjs/common';
import { firestore } from 'firebase-admin';
import { FollowedMatch } from './interfaces/followed-match.interface';

@Injectable()
export class FollowedMatchesRepository {
    private readonly _collectionRef: firestore.CollectionReference;

    constructor() {
        this._collectionRef = firestore().collection('followed_matches');
    }

    async create(userId: string, matchId: number): Promise<FollowedMatch> {
        const docId = `${userId}_${matchId}`;
        const docRef = this._collectionRef.doc(docId);

        const newFollow: Omit<FollowedMatch, 'id'> = {
            userId: userId,
            matchId: matchId,
            createdAt: firestore.FieldValue.serverTimestamp(),
        };

        await docRef.set(newFollow);
        return { id: docId, ...newFollow };
    }

    async delete(userId: string, matchId: number): Promise<any> {
        const docId = `${userId}_${matchId}`;
        return this._collectionRef.doc(docId).delete();
    }

    async findByUserId(userId: string): Promise<FollowedMatch[]> {
        const snapshot = await this._collectionRef.where('userId', '==', userId).get();
        if (snapshot.empty) {
            return [];
        }

        const follows: FollowedMatch[] = [];
        snapshot.forEach(doc => {
            follows.push({ id: doc.id, ...doc.data() } as FollowedMatch);
        });
        return follows;
    }
}
import { Injectable } from '@nestjs/common';
import { firestore } from 'firebase-admin';
import { FavouriteTeam } from './interfaces/favourite-team.interface';

@Injectable()
export class FavouriteTeamsRepository {
    private readonly _collectionRef: firestore.CollectionReference;

    constructor() {
        this._collectionRef = firestore().collection('favourite_teams');
    }

    
    async create(userId: string, teamId: number): Promise<FavouriteTeam> {
        const docId = `${userId}_${teamId}`;
        const docRef = this._collectionRef.doc(docId);

        const newFavourite: Omit<FavouriteTeam, 'id'> = {
            userId: userId,
            teamId: teamId,
            createdAt: firestore.FieldValue.serverTimestamp(),
        };

        await docRef.set(newFavourite);
        return { id: docId, ...newFavourite };
    }

    
    async delete(userId: string, teamId: number): Promise<any> {
        const docId = `${userId}_${teamId}`;
        return this._collectionRef.doc(docId).delete();
    }

    
    async findByUserId(userId: string): Promise<FavouriteTeam[]> {
        const snapshot = await this._collectionRef.where('userId', '==', userId).get();
        if (snapshot.empty) {
            return [];
        }

        const favourites: FavouriteTeam[] = [];
        snapshot.forEach(doc => {
            favourites.push({ id: doc.id, ...doc.data() } as FavouriteTeam);
        });
        return favourites;
    }
}
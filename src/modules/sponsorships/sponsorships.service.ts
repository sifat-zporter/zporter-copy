import { Injectable, Logger } from '@nestjs/common';
import { db } from '../../config/firebase.config';

@Injectable()
export class SponsorShipsService {
    private readonly logger = new Logger(SponsorShipsService.name);

    async getSponsors(type: string, userId: string): Promise<any[]> {
        try {
            if (type === 'potential') {
                const now = new Date();
                const MAX_RESULTS = 10;

                let connectionsSnap = await db
                    .collection('friends')
                    .where('userId', '==', userId)
                    .where('status', '==', 'accepted')
                    .get();

                if (connectionsSnap.empty) {
                    connectionsSnap = await db
                        .collection('follows')
                        .where('userId', '==', userId)
                        .where('status', '==', 'accepted')
                        .get();
                }

                const connectionIds = connectionsSnap.docs
                    .map(doc => doc.data().relationshipId)
                    .filter(uid => !!uid);

                const filteredUsers: any[] = [];

                for (const connectionId of connectionIds) {
                    if (filteredUsers.length >= MAX_RESULTS) break;

                    try {
                        const userSnap = await db.collection('users').doc(connectionId).get();
                        if (!userSnap.exists) continue;

                        const userData = userSnap.data();
                        const profile = userData?.profile;
                        if (!profile?.birthDay) continue;

                        const birthDate = new Date(profile.birthDay);
                        const age = now.getFullYear() - birthDate.getFullYear();
                        const monthDiff = now.getMonth() - birthDate.getMonth();
                        const dayDiff = now.getDate() - birthDate.getDate();
                        const realAge =
                            monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0)
                                ? age
                                : age - 1;

                        if (realAge > 26) {
                            filteredUsers.push({
                                id: connectionId,
                                username: userData?.username || null,
                                profile: profile,
                                media: userData?.media || null,
                            });
                        }
                    } catch (err) {
                        this.logger.warn(`Failed to fetch user ${connectionId}: ${err}`);
                    }
                }

                return filteredUsers;
            } else {
                const isActive = type === 'active' ? true : false;

                const snapshot = await db
                    .collection('sponsors')
                    .where('active', '==', isActive)
                    .where('userId', '==', userId)
                    .get();

                if (snapshot.empty) {
                    this.logger.log(`No sponsors found with type: ${type}`);
                    return [];
                }

                const sponsors: any[] = [];

                for (const doc of snapshot.docs) {
                    const sponsorData = doc.data();

                    let userData: any = {};
                    try {
                        const userSnap = await db.collection('users').doc(sponsorData.playerId).get();
                        if (userSnap.exists) {
                            userData = userSnap.data();
                        }
                    } catch (err) {
                        this.logger.warn(`Failed to fetch user for sponsor ${doc.id}`);
                    }

                    sponsors.push({
                        id: doc.id,
                        ...sponsorData,
                        username: userData?.username || null,
                        profile: userData?.profile || null,
                        media: userData?.media || null,
                    });
                }

                return sponsors;
            }
        } catch (error) {
            this.logger.error('Error fetching sponsor-related users', error);
            throw error;
        }
    }

    async getSponsorById(id: string): Promise<any> {
        try {
            const docRef = db.collection('sponsors').doc(id);
            const doc = await docRef.get();

            if (!doc.exists) {
                this.logger.log(`No sponsor found with id: ${id}`);
                return null;
            }

            const sponsorData = doc.data();

            let userData: any = {};
            try {
                const userSnap = await db.collection('users').doc(sponsorData.userId).get();
                if (userSnap.exists) {
                    userData = userSnap.data();
                }
            } catch (err) {
                this.logger.warn(`Failed to fetch user for sponsor ${doc.id}`);
            }

            return {
                id: doc.id,
                ...sponsorData,
                username: userData?.username || null,
                profile: userData?.profile || null,
                media: userData?.media || null,
            };
        } catch (error) {
            this.logger.error('Error fetching sponsor by ID', error);
            throw error;
        }
    }

    async updateSponsor(id: string, body: { sum: number; exchange: string; variable: string }): Promise<any> {
        try {
            const docRef = db.collection('sponsors').doc(id);
            const doc = await docRef.get();

            if (!doc.exists) {
                this.logger.log(`No sponsor found with id: ${id}`);
                return null;
            }

            await docRef.update({
                cost_of_training: body.sum,
                currency_cost_of_training: body.exchange,
                payment_type_cost_of_training: body.variable,
                updatedAt: new Date().toISOString(),
            });

            const updatedDoc = await docRef.get();
            const sponsorData = updatedDoc.data();

            let userData: any = {};
            try {
                const userSnap = await db.collection('users').doc(sponsorData.userId).get();
                if (userSnap.exists) {
                    userData = userSnap.data();
                }
            } catch (err) {
                this.logger.warn(`Failed to fetch user for sponsor ${id}`);
            }

            return {
                id: updatedDoc.id,
                ...sponsorData,
                username: userData?.username || null,
                profile: userData?.profile || null,
                media: userData?.media || null,
            };
        } catch (error) {
            this.logger.error('Error updating sponsor by ID', error);
            throw error;
        }
    }
}

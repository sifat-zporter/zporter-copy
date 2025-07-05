import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { db } from '../../config/firebase.config';
import { CreateSponsorDto } from './dto/sponsor.dto';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class SponsorRepository {
    constructor(private readonly stripeService: StripeService) { }

    async createOrUpdateSponsor(sponsorData: CreateSponsorDto) {
        const userRef = db.collection('users').doc(sponsorData.userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();
        const existingSponsors = await db.collection('sponsors').where('userId', '==', sponsorData.userId).where('playerId', '==', sponsorData.playerId).get();

        let customerId = userData.customerId;

        if (!customerId) {
            const customer = await this.stripeService.createCustomer(userData.account.email, userData.username);
            customerId = customer.id;
            await this.stripeService.attachPaymentMethod(sponsorData.paymentMethodId, customer.id);

            await userRef.update({ customerId });
        }

        if (existingSponsors.empty) {

            const newSponsor = {
                ...sponsorData,
                customerId: customerId,
                active: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            const ref = await db.collection('sponsors').add(newSponsor);
            return { id: ref.id, ...newSponsor };
        }

        const sponsorRef = existingSponsors.docs[0].ref;
        const updated = {
            ...sponsorData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await sponsorRef.update(updated);
        return { id: sponsorRef.id, ...updated };
    }

    async createOrUpdateSponsorOneTime(sponsorData: CreateSponsorDto) {
        const userRef = db.collection('users').doc(sponsorData.userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();
        const existingSponsors = await db.collection('sponsors').where('userId', '==', sponsorData.userId).where('playerId', '==', sponsorData.playerId).get();

        let customerId = userData.customerId;

        if (!customerId) {
            const customer = await this.stripeService.createCustomer(userData.account.email, userData.username);
            customerId = customer.id;

            await userRef.update({ customerId });
        }

        if (existingSponsors.empty) {

            const newSponsor = {
                ...sponsorData,
                customerId: customerId,
                active: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            const ref = await db.collection('sponsors').add(newSponsor);
            return { id: ref.id, ...newSponsor };
        }

        const sponsorRef = existingSponsors.docs[0].ref;
        const updated = {
            ...sponsorData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await sponsorRef.update(updated);
        const updatedDoc = await sponsorRef.get();
        return { id: sponsorRef.id, ...updatedDoc.data() };
    }

    getDateRangeForFrequency(now: Date, frequency: 'Monthly' | 'Yearly') {
        if (frequency === 'Monthly') {
            return {
                start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                end: new Date(now.getFullYear(), now.getMonth(), 0),
            };
        } else {
            return {
                start: new Date(now.getFullYear(), 0, 1),
                end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
            };
        }
    }

    async getSponsorsByPaymentType(type: string, variable?: string) {
        const snapshot = await db.collection('sponsors').where('payment_type_limit_cost', '==', type).where('payment_type_cost_of_training', '==', variable).where('active', '==', true).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    async calculateTotalNoOne(sponsors: any[], range: { start: Date; end: Date }) {
        const result = [];

        for (const sponsor of sponsors) {
            result.push({
                playerId: sponsor.playerId,
                userId: sponsor.userId,
                paymentMethodId: sponsor.paymentMethodId,
                currency: sponsor.currency_cost_of_training,
                amount: Math.round(sponsor.cost_of_training * 100),
                customerId: sponsor.customerId,
                sponsorId: sponsor.id,
            });
        }

        return result;
    }

    async calculateSponsorCosts(sponsors: any[], range: { start: Date; end: Date }) {
        const result = [];

        for (const sponsor of sponsors) {
            const diarySnapshot = await db
                .collection('diaries')
                .where('userId', '==', sponsor.playerId)
                .where('typeOfDiary', '==', 'TRAINING')
                .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(range.start))
                .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(range.end))
                .get();

            let totalHours = 0;
            diarySnapshot.forEach((doc) => {
                totalHours += doc.data()?.training?.hoursOfPractice || 0;
            });

            const totalCost = Math.min(totalHours * sponsor.cost_of_training, sponsor.limit_cost);
            if (totalCost > 0) {
                result.push({
                    playerId: sponsor.playerId,
                    userId: sponsor.userId,
                    paymentMethodId: sponsor.paymentMethodId,
                    currency: sponsor.currency_cost_of_training,
                    amount: Math.round(totalCost * 100),
                    customerId: sponsor.customerId,
                    sponsorId: sponsor.id,
                });
            }
        }

        return result;
    }

    async calculateTotalGoals(sponsors: any[], range: { start: Date; end: Date }) {
        const result = [];

        for (const sponsor of sponsors) {
            const diarySnapshot = await db
                .collection('diaries')
                .where('userId', '==', sponsor.playerId)
                .where('typeOfDiary', 'in', ['MATCH', 'CAP'])
                .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(range.start))
                .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(range.end))
                .get();

            let totalGoals = 0;
            diarySnapshot.forEach((doc) => {
                const { match, cap } = doc.data();
                if (match?.events?.length) {
                    match.events.forEach((e) => {
                        if (e.event === 'GOAL') {
                            totalGoals++;
                        }
                    });
                }
                if (cap?.events?.length) {
                    cap.events.forEach((e) => {
                        if (e.event === 'GOAL') {
                            totalGoals++;
                        }
                    });
                }
            });

            const totalCost = Math.min(totalGoals * sponsor.cost_of_training, sponsor.limit_cost);
            if (totalCost > 0) {
                result.push({
                    playerId: sponsor.playerId,
                    userId: sponsor.userId,
                    paymentMethodId: sponsor.paymentMethodId,
                    currency: sponsor.currency_cost_of_training,
                    amount: Math.round(totalCost * 100),
                    customerId: sponsor.customerId,
                    sponsorId: sponsor.id,
                });
            }
        }

        return result;
    }

    async calculateTotalAssists(sponsors: any[], range: { start: Date; end: Date }) {
        const result = [];

        for (const sponsor of sponsors) {
            const diarySnapshot = await db
                .collection('diaries')
                .where('userId', '==', sponsor.playerId)
                .where('typeOfDiary', 'in', ['MATCH', 'CAP'])
                .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(range.start))
                .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(range.end))
                .get();

            let totalAssists = 0;
            diarySnapshot.forEach((doc) => {
                const { match, cap } = doc.data();
                if (match?.events?.length) {
                    match.events.forEach((e) => {
                        if (e.event === 'ASSIST') {
                            totalAssists++;
                        }
                    });
                }
                if (cap?.events?.length) {
                    cap.events.forEach((e) => {
                        if (e.event === 'ASSIST') {
                            totalAssists++;
                        }
                    });
                }
            });

            const totalCost = Math.min(totalAssists * sponsor.cost_of_training, sponsor.limit_cost);
            if (totalCost > 0) {
                result.push({
                    playerId: sponsor.playerId,
                    userId: sponsor.userId,
                    paymentMethodId: sponsor.paymentMethodId,
                    currency: sponsor.currency_cost_of_training,
                    amount: Math.round(totalCost * 100),
                    customerId: sponsor.customerId,
                    sponsorId: sponsor.id,
                });
            }
        }

        return result;
    }

    async calculateTotalPoints(sponsors: any[], range: { start: Date; end: Date }) {
        const result = [];

        for (const sponsor of sponsors) {
            const diarySnapshot = await db
                .collection('diaries')
                .where('userId', '==', sponsor.playerId)
                .where('typeOfDiary', 'in', ['MATCH', 'CAP'])
                .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(range.start))
                .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(range.end))
                .get();

            let matchWins = 0;
            let matchDraws = 0;
            let matchLosses = 0;
            diarySnapshot.forEach((doc) => {
                const { match, typeOfDiary, cap } = doc.data();
                if (match?.events?.length) {
                    match.events.forEach((e) => {
                        if (
                            match?.result?.yourTeam > match?.result?.opponents ||
                            cap?.result?.yourTeam > cap?.result?.opponents
                        ) {
                            matchWins++;
                        }

                        if (
                            (match?.length &&
                                match?.result?.yourTeam === match?.result?.opponents) ||
                            (cap?.length && cap?.result?.yourTeam === cap?.result?.opponents)
                        ) {
                            matchDraws++;
                        }

                        if (
                            match?.result?.yourTeam < match?.result?.opponents ||
                            cap?.result?.yourTeam < cap?.result?.opponents
                        ) {
                            matchLosses++;
                        }
                    });
                }
            });

            const gatherPoint = 3 * matchWins + 1 * matchDraws + matchLosses * 0;

            const totalCost = Math.min(gatherPoint * sponsor.cost_of_training, sponsor.limit_cost);
            if (totalCost > 0) {
                result.push({
                    playerId: sponsor.playerId,
                    userId: sponsor.userId,
                    paymentMethodId: sponsor.paymentMethodId,
                    currency: sponsor.currency_cost_of_training,
                    amount: Math.round(totalCost * 100),
                    customerId: sponsor.customerId,
                    sponsorId: sponsor.id,
                });
            }
        }

        return result;
    }

    async saveTransaction(sponsor: any, paymentId: string) {
        return await db.collection('transaction_history').add({
            sponsorId: sponsor.sponsorId,
            playerId: sponsor.playerId,
            userId: sponsor.userId,
            amount: sponsor.amount / 100,
            currency: sponsor.currency,
            customerId: sponsor.customerId,
            paymentId,
            paymentIntentId: paymentId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    async deleteTransaction(id: string) {
        return await db.collection('transaction_history').doc(id).delete();
    }

    async deleteTransactionWithSessionId(paymentId: string) {
        const snapshot = await db.collection('transaction_history')
            .where('paymentId', '==', paymentId)
            .get();

        if (!snapshot.empty) {
            snapshot.forEach(async (doc) => {
                await doc.ref.delete();
            });
        } else {
            console.log('No matching transaction found.');
        }
    }

    async getTransactionHistory(userId: string) {
        const snapshot = await db.collection('transaction_history').where('userId', '==', userId).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    async getPlayerById(playerId: string) {
        const snapshot = await db.collection('users').doc(playerId).get();
        return snapshot.data();
    }

    async updateUserWallet(userId: string, amountInEUR: number, transactionId: string) {
        const balanceRef = db.collection('balance').doc(userId);
        const balanceDoc = await balanceRef.get();

        const currentBalance = balanceDoc.exists ? (balanceDoc.data()?.balance || 0) : 0;
        const newBalance = currentBalance + amountInEUR;

        await balanceRef.set(
            {
                userId,
                balance: newBalance,
                currency: 'eur',
                transactionId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );
    }

    getExchangeRate = (currency: string): number => {
        const exchangeRates: { [key: string]: number } = {
            usd: 0.92,
            sek: 0.085,
            eur: 1
        };

        if (!exchangeRates[currency]) {
            throw new Error(`Exchange rate for currency ${currency} is not available`);
        }

        return exchangeRates[currency];
    };

}

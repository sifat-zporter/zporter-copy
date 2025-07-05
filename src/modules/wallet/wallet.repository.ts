import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { db } from '../../config/firebase.config';
import { CreateWalletDto, TransferDto, WithdrawDto } from './dto/wallet.dto';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class WalletRepository {
    constructor(private readonly stripeService: StripeService) { }

    async transfer(transferDto: TransferDto) {
        try {
            const exchangeRate = this.getExchangeRate('sek');
            return await this.stripeService.createTransfer(transferDto.accountId, Math.round(transferDto.amount * 100 * exchangeRate), transferDto.currency);
        } catch (error) {
            throw new InternalServerErrorException(`Transfer failed: ${error.message}`);
        }
    }

    async createAccount(withdrawDto: WithdrawDto, email: string, userId: string) {
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        if (!userData) {
            throw new Error('User not found');
        }

        let accountId = userData.accountId;
        if (!accountId) {
            const connectAccount = await this.stripeService.createConnectAccount(email);
            accountId = connectAccount.id;
            await userRef.update({ accountId });
        }

        const tokenData = {
            bank_account: {
                country: 'SE',
                currency: 'sek',
                account_holder_name: userData.username,
                account_holder_type: 'individual',
                routing_number: withdrawDto.bic,
                account_number: withdrawDto.iban,
            },
        };

        const token = await this.stripeService.createBankToken(tokenData);
        if (!token || !token.id) {
            throw new Error('Failed to create bank token');
        }
        const tokenId = token.id;

        await this.stripeService.createExternalAccount(accountId, {
            external_account: tokenId,
        });

        const accountLink = await this.stripeService.createAccountLink(accountId, withdrawDto.total);
        return { url: accountLink.url };
    }

    async getAccountId(userId: string): Promise<string | null> {
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        if (!userData) {
            throw new Error('User not found');
        }

        const accountId = userData.accountId;
        if (!accountId) {
            return null;
        }

        const isEnabled = await this.stripeService.isConnectedAccountEnabled(accountId);
        return isEnabled ? accountId : null;
    }

    async createOrUpdateWalletOneTime(walletData: CreateWalletDto) {
        const userRef = db.collection('users').doc(walletData.userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        if (!userData) {
            throw new Error(`User with ID ${walletData.userId} not found.`);
        }

        let customerId = userData.customerId;

        if (!customerId) {
            const customer = await this.stripeService.createCustomer(userData.account.email, userData.username);
            customerId = customer.id;

            await userRef.update({ customerId });
        }

        const newSponsor = {
            ...walletData,
            customerId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        return newSponsor;
    }

    async getSponsorsByPaymentType(type: string) {
        const snapshot = await db.collection('sponsors').where('payment_type_limit_cost', '==', type).where('active', '==', true).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    async getLastTransactionByUserId(userId: string): Promise<any> {
        const snapshot = await db
            .collection('transaction_history')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        return snapshot.docs[0].data();
    }

    async saveTransaction(sponsor: any, paymentId: string) {
        return await db.collection('transaction_history').add({
            userId: sponsor.userId,
            amount: sponsor.amount / 100,
            currency: sponsor.currency,
            customerId: sponsor.customerId,
            balance: sponsor.balance,
            paymentId,
            paymentIntentId: paymentId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    async updateTransaction(sessionId: string, paymentIntent: any) {
        const snapshot = await db.collection('transaction_history')
            .where('paymentId', '==', sessionId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.error('No matching transaction found.');
            return;
        }

        const docRef = snapshot.docs[0].ref;

        await docRef.update({
            paymentId: paymentIntent.id,
            paymentIntentId: paymentIntent.id,
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

    async getAllTransactions(userId: string) {
        const snapshot = await db.collection('transaction_history').where('userId', '==', userId).get();
        const transactionsWithBalance = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((tx: any) => tx.balance !== undefined && tx.balance !== null);

        return transactionsWithBalance;
    }

    async getTransaction(id: string) {
        const snapshot = await db.collection('transaction_history').doc(id).get();
        const transactionData = snapshot.data();

        return transactionData;
    }

    async getPlayerById(playerId: string) {
        const snapshot = await db.collection('users').doc(playerId).get();
        return snapshot.data();
    }

    async updateUserWallet(userId: string, newBalance: number, transactionId: string) {
        const balanceRef = db.collection('balance').doc(userId);

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

    async getUserBalance(userId: string): Promise<any> {
        const nowInSeconds = Math.floor(Date.now() / 1000);

        const snapshot = await db
            .collection('transaction_history')
            .where('userId', '==', userId)
            .where('availableOn', '<=', nowInSeconds)
            .orderBy('availableOn', 'desc')
            .limit(1)
            .get();

        const transferSnapShot = await db
            .collection('transaction_history')
            .where('userId', '==', userId)
            .where('transactionType', '==', 'Withdraw')
            .get();

        const allTransferAmount = transferSnapShot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + (data.amount || 0);
        }, 0);

        if (snapshot.empty) {
            return { currency: 'sek', balance: allTransferAmount };
        }

        const lastTransaction = snapshot.docs[0].data();

        return {
            lastTransaction,
            totalWithdrawals: allTransferAmount,
            balance: (lastTransaction.balance || 0) + allTransferAmount,
            currency: 'sek'
        };
    }

}

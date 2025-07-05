import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { db } from '../../config/firebase.config';
import * as admin from 'firebase-admin';

@Injectable()
export class WebhookService {
    private stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2022-11-15',
    });

    // private endpointSecret = "whsec_7e66b5acb48078940c7301397034571113b0fd9f101ad0c4ac9637d8231103a3";
    // const endpointSecret = process.env.STRIPE_WEBHOOK;
    private endpointSecret = 'whsec_0APGnE8fcZl7PcE3Jh8Ka1EC9WyAtPzg';

    handleStripeEvent(rawBody: any, sig: string): string {
        const event = this.stripe.webhooks.constructEvent(rawBody, sig, this.endpointSecret);

        switch (event.type) {
            case 'payment_intent.succeeded':
                this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
                break;

            case 'transfer.created':
                this.handleTransferCreated(event.data.object as Stripe.Transfer);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return 'Webhook received';
    }

    private async handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
        setTimeout(async () => {
            try {
                const transaction = await this.stripe.balanceTransactions.list({
                    limit: 1,
                    source: intent.latest_charge as string,
                });

                const transactionData: any = {
                    createdAt: transaction.data[0].created,
                    availableOn: transaction.data[0].available_on,
                };

                const snapshot = await db
                    .collection('transaction_history')
                    .where('userId', '==', intent.metadata.userId)
                    .orderBy('createdAt', 'desc')
                    .limit(1)
                    .get();

                if (snapshot.empty) return null;
                const data = snapshot.docs[0].data();

                const previousBalance = Number(data?.balance || 0);
                const netAmount = Number(transaction.data[0].net || 0) / 100;
                const newBalance = Math.round(previousBalance + netAmount);

                if (intent.metadata?.userId) transactionData.userId = intent.metadata.userId;
                if (intent.amount != null) transactionData.amount = transaction.data[0].net / 100;
                if (intent.currency) transactionData.currency = transaction.data[0].currency;
                if (intent.customer) transactionData.customerId = intent.customer;
                if (intent.metadata?.balance) transactionData.balance = newBalance;
                if (intent.id) {
                    transactionData.paymentId = intent.id;
                    transactionData.paymentIntentId = intent.id;
                }

                await db.collection('transaction_history').add(transactionData);
            } catch (error) {
                console.error('Error fetching balance transaction:', error);
            }
        }, 3500);
    }

    private async handleTransferCreated(transfer: Stripe.Transfer) {
        try {
            const transactionData: any = {
                createdAt: transfer.created,
                transactionType: 'Withdraw'
            };

            const userSnapshot = await db.collection('users').where('accountId', '==', transfer.destination).get();
            if (userSnapshot.empty) return null;
            
            const userData = userSnapshot.docs[0].data();
            const userId = userData.userId;

            const snapshot = await db
                .collection('transaction_history')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) return null;
            const data = snapshot.docs[0].data();

            const previousBalance = Number(data?.balance || 0);
            const netAmount = Number(transfer.amount || 0) / 100;
            const newBalance = Math.round(previousBalance - netAmount);

            if (userId) transactionData.userId = userId;
            if (transfer.amount != null) transactionData.amount = -transfer.amount / 100;
            if (transfer.currency) transactionData.currency = transfer.currency;
            if (newBalance) transactionData.balance = newBalance;
            if (transfer.destination_payment) {
                transactionData.paymentId = transfer.destination_payment;
                transactionData.paymentIntentId = transfer.destination_payment;
            }

            await db.collection('transaction_history').add(transactionData);
        } catch (error) {
            console.error('Error fetching balance transaction:', error);
        }
    }
}

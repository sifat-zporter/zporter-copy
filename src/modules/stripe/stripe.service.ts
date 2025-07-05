import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
    private stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2022-11-15',
    });

    private buildMetadata(data: { userId?: string; playerId?: string; newBalance?: number }) {
        return {
            userId: data.userId ?? '',
            playerId: data.playerId ?? '',
            balance: data.newBalance ?? 0,
        };
    }

    async createConnectAccount(email: string) {
        return this.stripe.accounts.create({
            type: 'express',
            country: 'SE',
            email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
        });
    }

    async isConnectedAccountEnabled(accountId: string): Promise<boolean> {
        try {
            const account = await this.stripe.accounts.retrieve(accountId);

            return account.charges_enabled && account.payouts_enabled;
        } catch (error) {
            console.error('Error checking connected account:', error);
            throw error;
        }
    }

    async createBankToken(data: any) {
        return this.stripe.tokens.create(data);
    }

    async createExternalAccount(accountId: string, data: any) {
        return this.stripe.accounts.createExternalAccount(accountId, data);
    }

    async createTransfer(accountId: string, amount: number, currency: string) {
        return this.stripe.transfers.create({
            amount: amount * 100,
            currency: 'sek',
            destination: accountId,
        });
    }

    async payoutFromConnectedAccount(connectedAccountId: string, amount: number) {
        return this.stripe.payouts.create(
            {
                amount: amount * 100,
                currency: 'sek',
            },
            {
                stripeAccount: connectedAccountId,
            }
        );
    }

    async createAccountLink(accountId: string, amount: number): Promise<{ url: string }> {
        const accountLink = await this.stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${process.env.WEB_BASE_URL}/sponsor/payment-confirm?accountId=${accountId}&amount=${amount}&status=success`,
            return_url: `${process.env.WEB_BASE_URL}/account-and-settings?paymentType=withdraw&type=wallet`,
            type: 'account_onboarding',
        });

        return { url: accountLink.url };
    }

    async createCustomer(email: string, name: string) {
        return this.stripe.customers.create({ email, name });
    }

    async attachPaymentMethod(paymentMethodId: string, customerId: string) {
        await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        await this.stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });
    }

    private async createPaymentIntent(options: {
        amount: number;
        currency: string;
        customerId: string;
        paymentMethodId?: string;
        paymentMethodType?: string[];
        confirm?: boolean;
        offSession?: boolean | 'one_off';
        setupFutureUsage?: 'off_session' | 'on_session';
        metadata?: Record<string, any>;
        automaticPaymentMethods?: boolean;
        description?: string;
    }) {
        return this.stripe.paymentIntents.create({
            amount: options.amount,
            currency: options.currency,
            customer: options.customerId,
            payment_method: options.paymentMethodId,
            confirm: options.confirm,
            off_session: options.offSession,
            setup_future_usage: options.setupFutureUsage,
            metadata: options.metadata,
            automatic_payment_methods: options.automaticPaymentMethods
                ? { enabled: true }
                : undefined,
            description: options.description ?? 'Sponsorship payment',
            payment_method_types: options.paymentMethodType,
        });
    }

    async charge(data: {
        amount: number;
        currency: string;
        customerId: string;
        paymentMethodId: string;
        userId?: string;
        playerId?: string;
        newBalance?: number;
    }) {
        return this.createPaymentIntent({
            ...data,
            confirm: false,
            automaticPaymentMethods: true,
            metadata: this.buildMetadata(data),
        });
    }

    async chargeSponsor(data: {
        amount: number;
        currency: string;
        customerId: string;
        paymentMethodId: string;
        userId?: string;
        playerId?: string;
        newBalance?: number;
    }) {
        return this.createPaymentIntent({
            ...data,
            confirm: true,
            offSession: 'one_off',
            automaticPaymentMethods: true,
            metadata: this.buildMetadata(data),
        });
    }

    async chargeSponsorWithOffSession(data: {
        amount: number;
        currency: string;
        customerId: string;
        paymentMethodId: string;
        userId?: string;
        playerId?: string;
        newBalance?: number;
    }) {
        return this.createPaymentIntent({
            ...data,
            setupFutureUsage: 'off_session',
            confirm: false,
            metadata: this.buildMetadata(data),
        });
    }

    async chargeSponsorOneTime(data: {
        amount: number;
        currency: string;
        paymentMethodType: string;
        customerId: string;
        userId?: string;
        playerId?: string;
        newBalance?: number;
    }) {
        return this.createPaymentIntent({
            amount: data.amount,
            currency: data.currency,
            customerId: data.customerId,
            paymentMethodType: [data.paymentMethodType],
            metadata: this.buildMetadata(data),
        });
    }

    async chargeSponsorWithPayPal(data: {
        amount: number;
        currency: string;
        paymentMethodType: any;
        customerId: string;
        userId?: string;
        playerId?: string;
        newBalance?: number;
    }) {
        const baseSuccessUrl = `${process.env.WEB_BASE_URL}/sponsor/payment-confirm?sessionId={CHECKOUT_SESSION_ID}&status=success`;
        const baseCancelUrl = `${process.env.WEB_BASE_URL}/sponsor/payment-confirm?sessionId={CHECKOUT_SESSION_ID}&status=cancel`;

        const playerQuery = data.playerId ? `&playerId=${data.playerId}` : '';

        try {
            const session = await this.stripe.checkout.sessions.create({
                mode: 'payment',
                customer: data.customerId,
                line_items: [
                    {
                        price_data: {
                            currency: data.currency,
                            product_data: {
                                name: 'Process Payment',
                            },
                            unit_amount: data.amount,
                        },
                        quantity: 1,
                    },
                ],
                metadata: this.buildMetadata(data),
                payment_method_types: data.paymentMethodType,
                success_url: baseSuccessUrl + playerQuery,
                cancel_url: baseCancelUrl + playerQuery,
            });

            return session;
        } catch (error) {
            console.error('Stripe session creation failed:', error);

            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'This Payment Method doesn`t work for your currency',
                    error: error.message || error,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    async refundPayment(paymentId: string, amountInCents?: number) {
        try {
            return await this.stripe.refunds.create({
                payment_intent: paymentId,
                amount: amountInCents,
            });
        } catch (error) {
            throw new Error(`Refund failed: ${error.message}`);
        }
    }

    async getPaymentIntentWithSessionId(sessionId: string) {
        const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent'],
        });
        return session.payment_intent;
    }

    async getBalance(userId: string) {
        return this.stripe.balance.retrieve();
    }

    async getAllConnectedAccounts(limit: string) {
        try {
            const result = await this.stripe.accounts.list({ limit: Number(limit) || 10 });
            return result.data;
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }

    async deleteConnectedAccount(accountId: string) {
        try {
            return await this.stripe.accounts.del(accountId);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }
}

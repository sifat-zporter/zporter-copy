import { Injectable, Logger } from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { WalletRepository } from './wallet.repository';
import { CreateWalletDto, TransferDto, WithdrawDto } from './dto/wallet.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly walletRepo: WalletRepository,
  ) { }

  async transfer(transferDto: TransferDto): Promise<any> {
    return this.walletRepo.transfer(transferDto);
  }

  async chargeSponsorOneTime(walletData: CreateWalletDto): Promise<any> {
    try {
      const { cost, customer, newBalance } = await this.prepareTransactionData(walletData);

      const paymentIntent = await this.stripeService.chargeSponsorOneTime({
        ...cost,
        paymentMethodType: walletData.paymentMethodId,
        customerId: customer.customerId,
        newBalance: newBalance,
      });

      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (e) {
      this.logger.error(`Error processing payment: ${e.message}`, e.stack);
      throw new Error('Payment processing failed. Please try again later.');
    }
  }

  async chargeSponsorOneTimeWithCard(walletData: CreateWalletDto): Promise<any> {
    const { cost, customer, newBalance } = await this.prepareTransactionData(walletData);

    const paymentIntent = await this.stripeService.charge({
      ...cost,
      customerId: customer.customerId,
      newBalance: newBalance,
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  }

  async chargeSponsorWithPayPal(walletData: CreateWalletDto): Promise<any> {
    const { cost, customer, newBalance } = await this.prepareTransactionData(walletData);

    const paymentIntent = await this.stripeService.chargeSponsorWithPayPal({
      ...cost,
      paymentMethodType: ['card', walletData.paymentMethodId],
      customerId: customer.customerId,
      newBalance: newBalance,
    });

    return {
      sessionId: paymentIntent.id,
    };
  }

  async getAllTransactions(userId: string): Promise<any> {
    return this.walletRepo.getAllTransactions(userId);
  }

  async getTransaction(id: string): Promise<any> {
    return this.walletRepo.getTransaction(id);
  }

  async deleteTransaction(id: string): Promise<any> {
    return this.walletRepo.deleteTransaction(id);
  }

  async deleteTransactionWithSessionId(id: string): Promise<any> {
    return this.walletRepo.deleteTransactionWithSessionId(id);
  }

  private async prepareTransactionData(walletData: CreateWalletDto) {
    const customer = await this.walletRepo.createOrUpdateWalletOneTime(walletData);
    const exchangeRate = this.walletRepo.getExchangeRate('eur');
    const currentAmount = walletData.amount;

    const lastTransaction = await this.walletRepo.getLastTransactionByUserId(walletData.userId);
    const previousBalance = lastTransaction?.balance || 0;
    const newBalance = previousBalance + currentAmount;
    const amountToCharge = Math.round(currentAmount * 100 * exchangeRate);

    const cost = {
      userId: walletData.userId,
      paymentMethodId: walletData.paymentMethodId,
      currency: 'eur',
      amount: amountToCharge,
      balance: newBalance,
      customerId: customer.customerId,
    };

    return { cost, customer, newBalance };
  }

  async getUserBalance(userId: string): Promise<any> {
    let userData = await this.walletRepo.getUserBalance(userId);
    return { ...userData };
  }

  async savePaymentIntentIdWithSessionId(sessionId: string): Promise<any> {
    const paymentIntent = await this.stripeService.getPaymentIntentWithSessionId(sessionId);
    return await this.walletRepo.updateTransaction(sessionId, paymentIntent)
  }

  async createAccount(withdrawDto: WithdrawDto, email: string, userId: string): Promise<any> {
    return this.walletRepo.createAccount(withdrawDto, email, userId);
  }

  async getAccountId(userId: string): Promise<any> {
    return this.walletRepo.getAccountId(userId);
  }

  async getAllConnectedAccounts(limit: string): Promise<any> {
    const result = await this.stripeService.getAllConnectedAccounts(limit);

    return { success: true, accounts: result };
  }

  async deleteConnectedAccount(accountId: string): Promise<any> {
    return await this.stripeService.deleteConnectedAccount(accountId);
  }
}

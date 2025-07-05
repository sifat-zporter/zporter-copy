import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { SponsorRepository } from './sponsor.repository';
import { SendEmailService } from '../send-email/send-email.service';
import { CreateSponsorDto } from './dto/sponsor.dto';
import { firebaseStorage } from '../../config/firebase.config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SponsorService {
  private readonly logger = new Logger(SponsorService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly sponsorRepo: SponsorRepository,
    private readonly sendEmailService: SendEmailService,
  ) { }

  async createSponsor(sponsorData: CreateSponsorDto): Promise<any> {
    try {
      const customer: any = await this.sponsorRepo.createOrUpdateSponsor(sponsorData);
      const cost = {
        playerId: sponsorData.playerId,
        userId: sponsorData.userId,
        paymentMethodId: sponsorData.paymentMethodId,
        currency: sponsorData.currency_cost_of_training,
        amount: Math.round(
          (
            sponsorData.cost_of_training > sponsorData.limit_cost
              ? sponsorData.limit_cost
              : sponsorData.cost_of_training
          ) * 100
        ),
        customerId: customer.customerId,
        sponsorId: customer.id,
      }
      const paymentIntent = await this.stripeService.chargeSponsorWithOffSession(cost);
      return { clientSecret: paymentIntent.client_secret };
    } catch (error) {
      this.logger.error('Error creating sponsor', error);
      throw error;
    }
  }

  async chargeSponsorByFrequency(frequency: 'Monthly' | 'Yearly') {
    const now = new Date();
    const range = this.sponsorRepo.getDateRangeForFrequency(now, frequency);

    const sponsorsHourly = await this.sponsorRepo.getSponsorsByPaymentType(frequency, "Hourly");
    const sponsorsAssists = await this.sponsorRepo.getSponsorsByPaymentType(frequency, "assist");
    const sponsorsGoals = await this.sponsorRepo.getSponsorsByPaymentType(frequency, "goal");
    const sponsorsPoints = await this.sponsorRepo.getSponsorsByPaymentType(frequency, "points");
    const sponsorsNoOne = await this.sponsorRepo.getSponsorsByPaymentType(frequency, "no-one");
    if (!sponsorsHourly.length && !sponsorsAssists.length && !sponsorsGoals.length && !sponsorsPoints.length) {
      this.logger.log('No sponsors found');
      return { message: 'No sponsors found' };
    }

    const resultNoOneUser = await this.sponsorRepo.calculateTotalNoOne(sponsorsNoOne, range);
    const resultTotalHour = await this.sponsorRepo.calculateSponsorCosts(sponsorsHourly, range);
    const resultTotalAssists = await this.sponsorRepo.calculateTotalAssists(sponsorsAssists, range);
    const resultTotalGoals = await this.sponsorRepo.calculateTotalGoals(sponsorsGoals, range);
    const resultTotalPoints = await this.sponsorRepo.calculateTotalPoints(sponsorsPoints, range);
    const costs = [
      ...resultTotalHour,
      ...resultTotalAssists,
      ...resultTotalGoals,
      ...resultTotalPoints,
      ...resultNoOneUser,
    ];

    await Promise.all(
      costs.map(async (cost) => {
        try {
          this.logger.log(`⚡ Charging ${cost.userId} for ${cost.amount} ${cost.currency}`);
          const paymentIntent = await this.stripeService.chargeSponsor(cost);
          const transaction = await this.sponsorRepo.saveTransaction(cost, paymentIntent.id);

          const exchangeRate = this.sponsorRepo.getExchangeRate(cost.currency);

          const amountInEUR = Math.round(cost.amount / 100 * exchangeRate);

          await this.sponsorRepo.updateUserWallet(cost.userId, amountInEUR, transaction.id);

          this.logger.log(`✅ Payment successful for ${cost.userId}`);
        } catch (error) {
          this.logger.error(`❌ Stripe error for ${cost.userId}`, error.message);
        }
      })
    );

    return { message: `Payments processed for ${frequency.toLowerCase()} sponsors.` };
  }

  async chargeSponsorOneTime(sponsorData: CreateSponsorDto): Promise<any> {
    try {
      const customer: any = await this.sponsorRepo.createOrUpdateSponsorOneTime(sponsorData);
      const cost = {
        playerId: sponsorData.playerId,
        userId: sponsorData.userId,
        paymentMethodType: sponsorData.paymentMethodId,
        currency: sponsorData.currency_cost_of_training,
        amount: Math.round(
          (
            sponsorData.cost_of_training > sponsorData.limit_cost
              ? sponsorData.limit_cost
              : sponsorData.cost_of_training
          ) * 100
        ),
        customerId: customer.customerId,
        sponsorId: customer.id,
      }

      const exchangeRate = this.sponsorRepo.getExchangeRate(cost.currency);

      const amountInEUR = Math.round(cost.amount / 100 * exchangeRate);

      const paymentIntent = await this.stripeService.chargeSponsorOneTime(cost);
      const ref = await this.sponsorRepo.saveTransaction(cost, paymentIntent.id);

      await this.sponsorRepo.updateUserWallet(cost.userId, amountInEUR, ref.id);

      return {
        clientSecret: paymentIntent.client_secret,
        id: ref.id,
      }
    } catch (error) {
      console.error('chargeSponsorOneTime error:', error);

      throw new HttpException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error?.message || 'An unexpected error occurred during sponsor payment.',
        error: 'SponsorChargeFailed',
      }, HttpStatus.BAD_REQUEST);
    }
  }

  async chargeSponsorOneTimeWithCard(sponsorData: CreateSponsorDto): Promise<any> {
    const customer: any = await this.sponsorRepo.createOrUpdateSponsorOneTime(sponsorData);
    const cost = {
      playerId: sponsorData.playerId,
      userId: sponsorData.userId,
      paymentMethodId: sponsorData.paymentMethodId,
      currency: sponsorData.currency_cost_of_training,
      amount: Math.round(
        (
          sponsorData.cost_of_training > sponsorData.limit_cost
            ? sponsorData.limit_cost
            : sponsorData.cost_of_training
        ) * 100
      ),
      customerId: customer.customerId,
      sponsorId: customer.id,
    }
    const paymentIntent = await this.stripeService.charge(cost);
    const ref = await this.sponsorRepo.saveTransaction(cost, paymentIntent.id);

    const exchangeRate = this.sponsorRepo.getExchangeRate(cost.currency);

    const amountInEUR = Math.round(cost.amount / 100 * exchangeRate);

    await this.sponsorRepo.updateUserWallet(cost.userId, amountInEUR, ref.id);

    return { message: `Payments processed for sponsors.` }
  }

  async chargeSponsorWithPayPal(sponsorData: CreateSponsorDto): Promise<any> {
    const customer: any = await this.sponsorRepo.createOrUpdateSponsorOneTime(sponsorData);
    const cost = {
      playerId: sponsorData.playerId,
      userId: sponsorData.userId,
      paymentMethodType: [sponsorData.paymentMethodId],
      currency: sponsorData.currency_cost_of_training,
      amount: Math.round(
        (
          sponsorData.cost_of_training > sponsorData.limit_cost
            ? sponsorData.limit_cost
            : sponsorData.cost_of_training
        ) * 100
      ),
      customerId: customer.customerId,
      sponsorId: customer.id,
    }

    const paymentIntent = await this.stripeService.chargeSponsorWithPayPal(cost);
    const ref = await this.sponsorRepo.saveTransaction(cost, paymentIntent.id);

    const exchangeRate = this.sponsorRepo.getExchangeRate(cost.currency);

    const amountInEUR = Math.round(cost.amount / 100 * exchangeRate);

    await this.sponsorRepo.updateUserWallet(cost.userId, amountInEUR, ref.id);

    return {
      sessionId: paymentIntent.id,
      id: ref.id,
    }
  }

  chargeSponsorMonthly() {
    return this.chargeSponsorByFrequency('Monthly');
  }

  chargeSponsorYearly() {
    return this.chargeSponsorByFrequency('Yearly');
  }

  async deleteTransaction(id: string): Promise<any> {
    return await this.sponsorRepo.deleteTransaction(id);
  }

  async deleteTransactionWithSessionId(id: string): Promise<any> {
    return await this.sponsorRepo.deleteTransactionWithSessionId(id);
  }

  async uploadPaymentReceipt(file: any): Promise<any> {
    if (!file || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const filename = `receipts/${uuidv4()}-${file.originalname}`;
    const blob = firebaseStorage.file(filename);

    const stream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise<string>((resolve, reject) => {
      stream.on('error', (err: any) => {
        console.error('Upload error:', err);
        reject(new BadRequestException('Failed to upload file'));
      });

      stream.on('finish', async () => {
        await blob.makePublic();

        const publicUrl = `https://storage.googleapis.com/${firebaseStorage.name}/${filename}`;
        resolve(publicUrl);
      });

      stream.end(file.buffer);
    });
  }

  async sponsorSendEmail(emailData: any): Promise<any> {
    const { email, playerId, userId, message, uploadImageUrl } = emailData;
    const player = await this.sponsorRepo.getPlayerById(playerId);
    const sendEmailDto = {
      from: email,
      to: player.account.email,
      subject: 'Sponsorship Confirmation',
      text: message,
      imageUrl: uploadImageUrl,
    };
    return await this.sendEmailService.sendEmailWithImageURL(sendEmailDto);
  }
}

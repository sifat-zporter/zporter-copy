import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { WalletRepository } from './wallet.repository';
import { StripeService } from '../stripe/stripe.service';

@Module({
  controllers: [WalletController],
  providers: [
    WalletService, 
    WalletRepository, 
    StripeService, 
  ],
  exports: [WalletService],
})
export class WalletModule {}

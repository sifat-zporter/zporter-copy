import { Module } from '@nestjs/common';
import { SponsorService } from './sponsor.service';
import { SponsorController } from './sponsor.controller';
import { SponsorRepository } from './sponsor.repository';
import { StripeService } from '../stripe/stripe.service';
import { SendEmailService } from '../send-email/send-email.service';

@Module({
  controllers: [SponsorController],
  providers: [
    SponsorService, 
    SponsorRepository, 
    StripeService, 
    SendEmailService
  ],
  exports: [SponsorService],
})
export class SponsorModule {}

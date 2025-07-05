import { Module } from '@nestjs/common';
import { SponsorShipsService } from './sponsorships.service';
import { SponsorShipsController } from './sponsorships.controller';

@Module({
    controllers: [SponsorShipsController],
    providers: [
        SponsorShipsService,
        SponsorShipsController,
    ],
    exports: [SponsorShipsService],
})
export class SponsorShipsModule { }

import { Module } from '@nestjs/common';
import { HealthsService } from './healths.service';
import { HealthsController } from './healths.controller';

@Module({
  controllers: [HealthsController],
  providers: [HealthsService],
  exports: [HealthsService],
})
export class HealthsModule {}
 
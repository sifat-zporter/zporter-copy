import { forwardRef, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BiographyModule } from '../biography/biography.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { DiaryModule } from '../diaries/diaries.module';
import { UsersModule } from '../users/users.module';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { FantazyModule } from '../fantazy/fantazy.module';
import { SponsorModule } from '../sponsor/sponsor.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DashboardModule,
    DiaryModule,
    UsersModule,
    BiographyModule,
    forwardRef(() => FantazyModule),
    forwardRef(() => SponsorModule),
  ],
  providers: [SchedulesService],
  controllers: [SchedulesController],
})
export class SchedulesModule { }

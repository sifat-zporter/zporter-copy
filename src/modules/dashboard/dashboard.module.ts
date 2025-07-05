import { SendEmailModule } from './../send-email/send-email.module';
import { forwardRef, Module } from '@nestjs/common';
import { BiographyModule } from '../biography/biography.module';
import { DiaryModule } from '../diaries/diaries.module';
import { FeedModule } from '../feed/feed.module';
import { FriendsModule } from '../friends/friends.module';
import { HealthsModule } from '../healths/healths.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardBigQueryService } from './repositories/dashboard.repository';

@Module({
  imports: [
    NotificationsModule,
    FriendsModule,
    HealthsModule,
    forwardRef(() => BiographyModule),
    forwardRef(() => DiaryModule),
    forwardRef(() => FeedModule),
    forwardRef(() => SendEmailModule),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardBigQueryService],
  exports: [DashboardService, DashboardBigQueryService],
})
export class DashboardModule {}

import { Module } from '@nestjs/common';
import { DevelopmentTalkService } from './development-talk.service';
import { DevelopmentTalkController } from './development-talk.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [DevelopmentTalkController],
  providers: [DevelopmentTalkService],
})
export class DevelopmentTalkModule {}

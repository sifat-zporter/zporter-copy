import { Module } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { ClubModule } from '../clubs/clubs.module';
import { FeedModule } from '../feed/feed.module';

@Module({
  imports: [ClubModule, FeedModule],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}

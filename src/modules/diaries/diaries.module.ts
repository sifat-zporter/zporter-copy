import { AchievementsModule } from './../achievements/achievements.module';
import { forwardRef, Module } from '@nestjs/common';
import { CacheManagerModule } from '../cache-manager/cache-manager.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { FeedModule } from '../feed/feed.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TagsModule } from '../tags/tags.module';
import { TeamsModule } from '../teams/teams.module';
import { DiaryController } from './diaries.controller';
import { DiaryService } from './diaries.service';
import { DiariesBigQueryService } from './repositories/diaries.repository';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UsersMatchSchema,
  USER_MATCH_MODEL,
} from './schemas/user-match.schema';
import { DreamTeamSchema, DREAM_TEAM_MODEL } from './schemas/dream-team.schema';
import { UsersModule } from '../users/users.module';
import { FantazyModule } from '../fantazy/fantazy.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: USER_MATCH_MODEL,
        schema: UsersMatchSchema,
      },
      {
        name: DREAM_TEAM_MODEL,
        schema: DreamTeamSchema,
      },
    ]),
    forwardRef(() => FantazyModule),
    TagsModule,
    forwardRef(() => FeedModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => TeamsModule),
    CacheManagerModule,
    forwardRef(() => DashboardModule),
    forwardRef(() => AchievementsModule),
    forwardRef(() => UsersModule),
    // FantazyModule
    // FantazyService
  ],
  controllers: [DiaryController],
  providers: [DiaryService, DiariesBigQueryService],
  exports: [DiariesBigQueryService, DiaryService],
})
export class DiaryModule {}

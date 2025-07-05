import { DiaryModule } from './../diaries/diaries.module';
import { forwardRef, Module } from '@nestjs/common';
import { BiographyService } from './biography.service';
import { BiographyController } from './biography.controller';
import { DashboardModule } from '../dashboard/dashboard.module';
import { CareersModule } from '../careers/careers.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { FriendsModule } from '../friends/friends.module';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';
import { BiographyBigQueryService } from './repositories/biography.repository';
import { FeedModule } from '../feed/feed.module';
import { ClubModule } from '../clubs/clubs.module';
import { ProgramsModule } from '../programs/programs.module';
import { TestsModule } from '../tests/test.module';

@Module({
  imports: [
    DashboardModule,
    forwardRef(() => ClubModule),
    CareersModule,
    forwardRef(() => AchievementsModule),
    UsersModule,
    forwardRef(() => FriendsModule),
    TeamsModule,
    forwardRef(() => FeedModule),
    forwardRef(() => DiaryModule),
    ProgramsModule,
    TestsModule,
  ],
  controllers: [BiographyController],
  providers: [BiographyService, BiographyBigQueryService],
  exports: [BiographyService],
})
export class BiographyModule {}

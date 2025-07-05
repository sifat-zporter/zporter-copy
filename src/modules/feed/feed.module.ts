import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DateUtil } from '../../utils/date-util';
import { MediaUtil } from '../../utils/media-util';
import { AbstractModule } from '../abstract/abstract.module';
import { BiographyModule } from '../biography/biography.module';
import { CacheManagerModule } from '../cache-manager/cache-manager.module';
import { ClubModule } from '../clubs/clubs.module';
import { CommentModule } from '../comment/comment.module';
import { CrmModule } from '../crm/crm.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { DiaryModule } from '../diaries/diaries.module';
import { FriendsModule } from '../friends/friends.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamsModule } from '../teams/teams.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { FeedRepository } from './mongo-repository/feed.repository';
import { PostSchema } from './mongo-repository/post';
import { FeedBigQueryService } from './repositories/feed.repository';
import { FeedsSchema, FEED_MODEL } from './schemas/feed.schemas';
import { FeedMongoService } from './service/feed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: FEED_MODEL,
        schema: FeedsSchema,
      },
      {
        name: FEED_MODEL,
        schema: PostSchema,
      },
    ]),
    forwardRef(() => DashboardModule),
    FriendsModule,
    CommentModule,
    forwardRef(() => ClubModule),
    NotificationsModule,
    TeamsModule,
    forwardRef(() => BiographyModule),
    CacheManagerModule,
    forwardRef(() => DiaryModule),
    forwardRef(() => CrmModule),
    AbstractModule,
  ],
  controllers: [FeedController],
  providers: [
    FeedService,
    FeedBigQueryService,
    FeedRepository,
    FeedMongoService,
  ],
  exports: [FeedService, FeedBigQueryService],
})
export class FeedModule {}

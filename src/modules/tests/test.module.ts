import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedModule } from '../feed/feed.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DateUtil } from '../../utils/date-util';
import { ObjectMapper } from '../../utils/objectMapper';
import { ClubModule } from '../clubs/clubs.module';
import { UsersModule } from '../users/users.module';
import { TestsController } from './controller/new-test.controller';
import { UserTestsController } from './controller/new-user-test.controller';
import { SubtypeController } from './controller/subtype.controller';
import { DashboardTestController } from './controller/dashboard-test.controller';
import { SubtypeRepository } from './repository/subtype/subtype.repository';
import {
  UserTestSchema,
  USER_TEST_MODEL,
} from './repository/user-test/user-test';
import { UserTestRepository } from './repository/user-test/user-test.repository';
import { SubtypeService } from './service/subtype/subtype.service';
import { TestService } from './service/test/test.service';
import { UserTestService } from './service/user-test/user-test.service';
import {
  ResultStorageSchema,
  RESULT_STORAGE_MODEL,
} from './repository/result-storage/result-storage';
import { ResultStorageRepository } from './repository/result-storage/result-storage.repository';
import { ResultStorageService } from './service/result-storage/result-storage.service';
import { DashboardTestService } from './service/dashboard-test/dashboard-test.service';
import { SubtypeSchema, SUBTYPE_MODEL } from './repository/subtype/subtype';
import { MinorUserTesService } from './service/user-test/minor-service/minor.user-test.service';
import { TeamsModule } from '../teams/teams.module';
import { DirectLeaderboardService } from './service/dashboard-test/leaderboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: USER_TEST_MODEL,
        schema: UserTestSchema,
      },
      {
        name: SUBTYPE_MODEL,
        schema: SubtypeSchema,
      },
      {
        name: RESULT_STORAGE_MODEL,
        schema: ResultStorageSchema,
      },
    ]),
    forwardRef(() => NotificationsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => ClubModule),
    forwardRef(() => FeedModule),
    TeamsModule,
  ],
  controllers: [
    TestsController, 
    UserTestsController, 
    SubtypeController,
    DashboardTestController
  ],
  providers: [
    TestService,
    UserTestRepository,
    UserTestService,
    DateUtil,
    ObjectMapper,
    SubtypeRepository,
    SubtypeService,
    ResultStorageRepository,
    ResultStorageService,
    MinorUserTesService,
    DashboardTestService,
    DirectLeaderboardService,
  ],
  exports: [UserTestService, DashboardTestService, DirectLeaderboardService],
})
export class TestsModule {}

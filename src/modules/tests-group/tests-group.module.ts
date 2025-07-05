import { Module } from '@nestjs/common';
import { TestsGroupController } from './tests-group.controller';
import { TestsGroupService } from './tests-group.service';
import { SubtypeRepository } from '../tests/repository/subtype/subtype.repository';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SUBTYPE_MODEL,
  SubtypeSchema,
} from '../tests/repository/subtype/subtype';
import { DateUtil } from '../../utils/date-util';
import {
  TESTS_GROUP_MODEL,
  TestsGroupSchema,
} from './entities/tests-group.entity';
import { TestsGroupRepository } from './repositories/tests-group.repository';
import { TeamsModule } from '../teams/teams.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [TestsGroupController],
  providers: [
    TestsGroupService,
    TestsGroupRepository,
    SubtypeRepository,
    DateUtil,
  ],
  imports: [
    MongooseModule.forFeature([
      { name: TESTS_GROUP_MODEL, schema: TestsGroupSchema },
      { name: SUBTYPE_MODEL, schema: SubtypeSchema },
    ]),
    TeamsModule,
    NotificationsModule,
  ],
})
export class TestsGroupModule {}

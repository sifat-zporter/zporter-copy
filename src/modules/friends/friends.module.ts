import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DateUtil } from '../../utils/date-util';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserSchema, USER_MODEL } from '../users/schemas/user.schema';
import { ContactGroupsModule } from './../contact-groups/contact-groups.module';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { FollowsMongoRepository } from './repositories/follows.mongo.repository';
import { FriendsMongoRepository } from './repositories/friends.mongo.repository';
import { FriendsBigQueryService } from './repositories/friends.repository';
import {
  FollowsSchema,
  FOLLOW_MODEL,
  FriendsSchema,
  FRIEND_MODEL,
} from './schemas/friend.schemas';

@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => ContactGroupsModule),
    MongooseModule.forFeature([
      {
        name: FRIEND_MODEL,
        schema: FriendsSchema,
      },
      {
        name: FOLLOW_MODEL,
        schema: FollowsSchema,
      },
      {
        name: USER_MODEL,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [FriendsController],
  providers: [
    FriendsService,
    FriendsBigQueryService,
    FriendsMongoRepository,
    FollowsMongoRepository,
    DateUtil,
  ],
  exports: [FriendsService, FriendsBigQueryService],
})
export class FriendsModule {}

import { forwardRef, Module } from '@nestjs/common';
import { ClubModule } from '../clubs/clubs.module';
import { FeedModule } from '../feed/feed.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SendEmailModule } from './../send-email/send-email.module';
import { TagsModule } from '../tags/tags.module';
import { TeamsModule } from '../teams/teams.module';
import { FriendsModule } from './../friends/friends.module';
import { UsersFirebaseService } from './repositories/users.firebase.repository';
import { UsersBigQueryService } from './repositories/users.repository';
import { UsersController } from './v1/users.controller';
import { UsersService } from './v1/users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema, USER_MODEL } from './schemas/user.schema';
import { UsersFantazyService } from './users.fantazy.service';
import { CrmModule } from '../crm/crm.module';
import { UsersMongoRepository } from './repositories/users.mongo.repository';
import { DateUtil } from '../../utils/date-util';
import { UserRepository } from './repositories/user/user.repository';
import { UsersV2Controller } from './v2/users.controller';
import { UsersV2Service } from './v2/users.service';
import { DraftUser, DraftUserSchema } from './schemas/draft-user.schema';
import { DraftUsersMongoRepository } from './repositories/draft-users.mongo.repository';
import { CLUB_MODEL, ClubsSchema } from '../clubs/schemas/clubs.schemas';
import { ClubRepository } from '../clubs/repository/club.repository';
import { TEAMS_MODEL, TeamSchema } from '../teams/schemas/team.schema';
import { TeamsMongoRepository } from '../teams/repositories/teams/teams.mongo.repository';
@Module({
  imports: [
    TagsModule,
    forwardRef(() => ClubModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => TeamsModule),
    forwardRef(() => FriendsModule),
    forwardRef(() => FeedModule),
    forwardRef(() => SendEmailModule),
    forwardRef(() => CrmModule),
    MongooseModule.forFeature([
      {
        name: USER_MODEL,
        schema: UserSchema,
      },
      {
        name: DraftUser.name,
        schema: DraftUserSchema,
      },
      {
        name: CLUB_MODEL,
        schema: ClubsSchema,
      },
      {
        name: TEAMS_MODEL,
        schema: TeamSchema,
      },
    ]),
  ],
  controllers: [UsersV2Controller, UsersController],
  providers: [
    UsersService,
    UsersV2Service,
    UsersFantazyService,
    UsersFirebaseService,
    UsersBigQueryService,
    UsersMongoRepository,
    DateUtil,
    UserRepository,
    DraftUsersMongoRepository,
    ClubRepository,
    TeamsMongoRepository,
  ],
  exports: [
    UserRepository,
    UsersService,
    UsersFantazyService,
    UsersFirebaseService,
    UsersBigQueryService,
    UsersMongoRepository,
    DraftUsersMongoRepository,
  ],
})
export class UsersModule {}

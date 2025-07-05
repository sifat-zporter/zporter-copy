import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheManagerModule } from '../cache-manager/cache-manager.module';
import { ClubModule } from '../clubs/clubs.module';
import { FriendsModule } from '../friends/friends.module';
import { NotificationsModule } from './../notifications/notifications.module';
import { TeamsFirebaseService } from './repositories/teams.firebase.repository';
import { TeamsBigQueryService } from './repositories/teams.repository';
import { TeamSchema, TEAMS_MODEL } from './schemas/team.schema';
import { UsersTeamsSchema, USERS_TEAMS } from './schemas/users-teams.schema';
import { TeamsMongoService } from './service/teams/teams.mongo.service';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamsMongoRepository } from './repositories/teams/teams.mongo.repository';
import { UsersTeamsUtils } from './utils/users-teams.utils';
import { TeamsUtils } from './utils/teams.utils';
import { UsersTeamsMongoRepository } from './repositories/users-teams/users-teams.mongo.repository';
import { UsersModule } from '../users/users.module';
import { UsersTeamsMongoService } from './service/users-teams/users-teams.mongo.service';
import { ObjectMapper } from '../../utils/objectMapper';
import { DateUtil } from '../../utils/date-util';

@Module({
  imports: [
    // NotificationsModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => FriendsModule),
    forwardRef(() => CacheManagerModule),
    // forwardRef(() => CacheManagerModule),
    // CacheManagerModule,
    forwardRef(() => ClubModule),
    forwardRef(() => UsersModule),
    MongooseModule.forFeature([
      {
        name: TEAMS_MODEL,
        schema: TeamSchema,
      },
      {
        name: USERS_TEAMS,
        schema: UsersTeamsSchema,
      },
    ]),
    forwardRef(() => UsersModule),
    MongooseModule.forFeature([
      {
        name: TEAMS_MODEL,
        schema: TeamSchema,
      },
      {
        name: USERS_TEAMS,
        schema: UsersTeamsSchema,
      },
    ]),
  ],
  controllers: [TeamsController],
  providers: [
    TeamsService,
    TeamsFirebaseService,
    TeamsBigQueryService,
    TeamsMongoService,
    UsersTeamsMongoService,
    TeamsMongoRepository,
    UsersTeamsMongoRepository,
    UsersTeamsUtils,
    TeamsUtils,
    ObjectMapper,
    DateUtil,
  ],
  exports: [TeamsService, TeamsFirebaseService, TeamsBigQueryService],
})
export class TeamsModule {}

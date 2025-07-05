import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AbstractModule } from '../abstract/abstract.module';
import { FeedModule } from '../feed/feed.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClubController } from './v1/clubs.controller';
import { ClubService } from './v1/clubs.service';
import { ClubRepository } from './repository/club.repository';
import { ClubsSchema, CLUB_MODEL } from './schemas/clubs.schemas';
import { ClubV2Service } from './v2/clubs.service';
import { ClubV2Controller } from './v2/clubs.controller';
import { TEAMS_MODEL, TeamSchema } from '../teams/schemas/team.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: CLUB_MODEL,
        schema: ClubsSchema,
      },
      {
        name: TEAMS_MODEL,
        schema: TeamSchema,
      },
    ]),
    forwardRef(() => NotificationsModule),
    FeedModule,
    AbstractModule,
  ],
  controllers: [ClubV2Controller, ClubController],
  providers: [ClubV2Service, ClubService, ClubRepository],
  exports: [ClubService, ClubRepository],
})
export class ClubModule {}

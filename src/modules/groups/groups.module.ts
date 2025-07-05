import { forwardRef, Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamsModule } from '../teams/teams.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { GroupsFirebaseService } from './repositories/groups.firebase.repository';
import { GroupsBigQueryService } from './repositories/groups.repository';

@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => FriendsModule),
    forwardRef(() => TeamsModule),
  ],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsFirebaseService, GroupsBigQueryService],
  exports: [GroupsService, GroupsFirebaseService],
})
export class GroupsModule {}

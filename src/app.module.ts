import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { HttpExceptionFilter } from './common/filter/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AbstractModule } from './modules/abstract/abstract.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { BiographyModule } from './modules/biography/biography.module';
import { CareersModule } from './modules/careers/careers.module';
import { ClubModule } from './modules/clubs/clubs.module';
import { CommentModule } from './modules/comment/comment.module';
import { CommentsModule } from './modules/comments/comments.module';
import { ContactGroupsModule } from './modules/contact-groups/contact-groups.module';
import { CrmModule } from './modules/crm/crm.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DevelopmentTalkModule } from './modules/development-talk/development-talk.module';
import { DiaryModule } from './modules/diaries/diaries.module';
import { FantazyModule } from './modules/fantazy/fantazy.module';
import { FeedModule } from './modules/feed/feed.module';
import { FriendsModule } from './modules/friends/friends.module';
import { GroupsModule } from './modules/groups/groups.module';
import { HealthsModule } from './modules/healths/healths.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { LibraryModule } from './modules/libraries/library.module';
import { LoggerModule } from './modules/logger/logger.module';
import { MedicalsModule } from './modules/medical/medical.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProfileProviderModule } from './modules/profile-provider/profile-provider.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { SendEmailModule } from './modules/send-email/send-email.module';
import { TagsModule } from './modules/tags/tags.module';
import { TeamsModule } from './modules/teams/teams.module';
import { TestsGroupModule } from './modules/tests-group/tests-group.module';
import { TestsModule } from './modules/tests/test.module';
import { UsersModule } from './modules/users/users.module';

import { ZaiModule } from './modules/zai/zai.module';

import { CalendarEventModule } from './modules/calendar/calendar.module';
import { DriveModule } from './modules/drive/drive.module';
import { SponsorModule } from './modules/sponsor/sponsor.module';
import { SponsorShipsModule } from './modules/sponsorships/sponsorships.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WebhookModule } from './modules/webhook/webhook.module';

import { PromptTemplatesModule } from './modules/zporter-ai/prompt-templates/prompt-templates.module';
import { ZaiRequestModule } from './modules/zporter-ai/zai/zai.request.module';

import { HealthIntegrationModule } from './modules/healthIntegeration/health-integration.module';

import { MatchTeamModule } from './microservice/match/modules/teams/match-team.module'; // <-- IMPORT THE NEW MODULE
import { FavouriteTeamsModule } from './microservice/match/modules/favourite-teams/favourite-teams.module'; // <-- IMPORT THE NEW MODULE
import { FixturesModule } from './microservice/match/modules/fixtures/fixtures.module';
import { SportmonksModule } from './microservice/match/modules/sportmonks/sportmonks.module';
import { FollowedMatchesModule } from './microservice/match/modules/followed-matches/followed-matches.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGO_URL,
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../src', 'client'),
    }),
    AuthModule,
    // ConfigModule.forRoot({
    //   envFilePath: `.env.${process.env.NODE_ENV}`,
    // }),
    TagsModule,
    UsersModule,
    InvitationModule,
    DiaryModule,
    ClubModule,
    BiographyModule,
    DashboardModule,
    FeedModule,
    CareersModule,
    CommentModule,
    FriendsModule,
    AchievementsModule,
    LoggerModule,
    ThrottlerModule.forRoot({}),
    NotificationsModule,
    ContactGroupsModule,
    GroupsModule,
    TeamsModule,
    DevelopmentTalkModule,
    HealthsModule,
    CrmModule,
    SchedulesModule,
    SendEmailModule,
    SponsorModule,
    FantazyModule,
    AuthorizationModule,
    TestsModule,
    AuthorizationModule,
    ProgramsModule,
    AbstractModule,
    LibraryModule,
    CommentsModule,

    ZaiModule,
    DriveModule,
    TestsGroupModule,

    MedicalsModule,
    ProfileProviderModule,
    TestsGroupModule,
    WalletModule,
    SponsorShipsModule,
    WebhookModule,

    CalendarEventModule,
    PromptTemplatesModule,
    ZaiRequestModule,

    HealthIntegrationModule,

    CalendarEventModule,

    MatchTeamModule,
    FavouriteTeamsModule,
    FixturesModule,
    SportmonksModule,
    FollowedMatchesModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

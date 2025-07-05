import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AchievementsModule } from "../achievements/achievements.module";
import { FeedModule } from "../feed/feed.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { UserSchema, USER_MODEL } from "../users/schemas/user.schema";
import { FantazyController } from "./fantazy.controller";
import { FantazyService } from "./fantazy.service";
import { FantazyTeamSchema, FantazyTeamWinnersSchema, FANTAZY_TEAM_MODEL, FANTAZY_TEAM_WINNER_MODEL } from "./schemas/fantazy.schemas";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: FANTAZY_TEAM_MODEL,
        schema: FantazyTeamSchema,
      },
      {
        name: FANTAZY_TEAM_WINNER_MODEL,
        schema: FantazyTeamWinnersSchema,
      },
      {
        name: USER_MODEL,
        schema: UserSchema,
      },
    ]),
    forwardRef(() => NotificationsModule),
    forwardRef(() => AchievementsModule),
    forwardRef(() => FeedModule)
  ],
  controllers: [FantazyController],
  providers: [FantazyService],
  exports: [FantazyService],
})
export class FantazyModule { }

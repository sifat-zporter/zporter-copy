import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EVENT_MODEL, EventSchema } from "./schemas/event.schema";
import { CalendarEventController } from "./calendar.controller";
import { EventsService } from "./calendar.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { ReminderService } from "./services/reminder/reminder.service";
import { TeamTrainingService } from "./services/team_training/team-training.service";
import { MatchService } from "./services/match/match.service";
import { OtherService } from "./services/other/other.service";


@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: EVENT_MODEL,
                schema: EventSchema,
            },
        ]),
        forwardRef(() => NotificationsModule)
    ],
    controllers: [CalendarEventController],
    providers: [EventsService, ReminderService, TeamTrainingService, MatchService, OtherService],
    exports: [],
})
export class CalendarEventModule { }

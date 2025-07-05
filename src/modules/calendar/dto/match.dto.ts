
import { OmitType, PartialType } from "@nestjs/swagger";
import { EventDto } from "./event.dto";

export class MatchDto extends OmitType(EventDto, ['recurringType', 'untilDate', 'type', 'notificationMinute', 'sendNotification', 'isAllDay', 'isGathering', 'invitedUsers', 'gatheringMinute', 'isOccupied', 'fee', 'participants', 'evaluations', 'effectiveEndDate']) {

}

export class UpdateMatchDto extends PartialType(MatchDto) {
}
import { OmitType, PartialType } from "@nestjs/swagger";
import { EventDto } from "./event.dto";

export class TeamTrainingDto extends OmitType(EventDto, ['type', 'notificationMinute', 'matchStart', 'matchSide', 'matchCategory', 'cupSeriesName', 'matchArena', 'matchSide', 'matchLength', 'cupSeriesName', 'opponentClubId', 'opponentTeamId', 'participantVisibility', 'matchArena', 'matchLength', 'isAllDay', 'isGathering', 'invitedUsers', 'gatheringMinute', 'isOccupied', 'fee', 'participants', 'evaluations', 'isSendInviteToOpponent', 'isSendInvitations', 'effectiveEndDate'] as const) {
}

export class UpdateTeamTrainingDto extends PartialType(TeamTrainingDto) {

}
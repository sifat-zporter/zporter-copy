import { OmitType, PartialType } from "@nestjs/swagger";
import { EventDto } from "./event.dto";
import { EventParticipantDto } from "./event-participants.dto";
import { EventEvaluationsDto } from "./event-evaluations.dto";

export class OtherEventDto extends OmitType(EventDto, ['matchStart', 'matchCategory', 'cupSeriesName', 'matchArena', 'matchSide', 'opponentClubId', 'opponentTeamId', 'participantVisibility', 'matchLength', 'teamInvitations', 'participants', 'evaluations', 'isSendInviteToOpponent', 'isSendInvitations', 'effectiveEndDate'] as const) {
}

export class UpdateOtherEventDto extends PartialType(OtherEventDto) {
}
import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { UserTypes } from "../../users/enum/user-types.enum";
import { EventDto } from "./event.dto";
import { EventParticipantDto } from "./event-participants.dto";
import { EventEvaluationsDto } from "./event-evaluations.dto";

export class InvitedUsers {
   @ApiProperty({ description: 'Email of the invited user' })
   email: string;

   @ApiProperty()
   isActive: boolean;

   @ApiProperty()
   birthCountry: string;

   @ApiProperty()
   fullName: string;

   @ApiProperty()
   clubId: string;

   @ApiProperty()
   currentHubspotId: string;

   @ApiProperty()
   firstName: string;

   @ApiProperty()
   city: string;

   @ApiProperty()
   settingCountryRegion?: string;

   @ApiProperty()
   settingCountryName?: string;

   @ApiProperty()
   favoriteRoles?: string[];

   @ApiProperty()
   currentTeams?: string[];

   @ApiProperty()
   lastName: string;

   @ApiProperty()
   faceImage?: string;

   @ApiProperty()
   username: string;

   @ApiProperty()
   type: UserTypes;

   @ApiProperty()
   userId: string;

   @ApiProperty()
   teamIds?: string[];

   @ApiProperty()
   isOnline?: boolean;

   @ApiProperty()
   clubName?: string;

   @ApiProperty()
   clubLogoUrl?: string;

   @ApiProperty()
   timezone?: string;

   @ApiProperty()
   lastActive?: Date | null;

   @ApiProperty()
   birthDay?: Date | null;

   @ApiProperty()
   createdAt?: Date | null;

   @ApiProperty()
   updatedAt?: Date | null;

   @ApiProperty()
   shirtNumber?: number
}

export class ReminderDto extends OmitType(EventDto, ['type', 'matchStart', 'endDate', 'matchCategory', 'cupSeriesName', 'matchArena', 'matchSide', 'opponentClubId', 'opponentTeamId', 'participantVisibility', 'matchLength', 'teamInvitations', 'isAllDay', 'isGathering', 'gatheringMinute', 'isOccupied', 'fee', 'participants', 'evaluations', 'isSendInviteToOpponent', 'isSendInvitations', 'effectiveEndDate'] as const) {
}


export class UpdateReminderDto extends PartialType(ReminderDto) {
}

export class CreateReminderDto extends OmitType(ReminderDto, ['invitedUsers'] as const) {
   @ApiProperty({
      description: 'Unique identifier for the reminder event',
      example: '1234567890abcdef',
   })
   id: string;

   // @ApiProperty({
   //    description: 'List of invited users for the reminder event',
   //    type: [InvitedUsers],
   //    required: false,
   // })
   // invitedUsers?: InvitedUsers[];
   // participants: EventParticipantDto[];
   // evaluations: EventEvaluationsDto[];
}
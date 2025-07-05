
import { OmitType } from "@nestjs/swagger";
import { EventDto } from "./event.dto";

export class CreatedEventDto extends OmitType(EventDto, ['invitedUsers', 'teamInvitations']) {
    id: string;
}
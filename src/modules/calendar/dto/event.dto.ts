import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsDate, IsDefined, IsEnum, IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Matches, MinDate, ValidateIf, ValidateNested } from "class-validator";
import { DateUtil } from "../../../utils/date-util";
import { MatchCategory, MatchSide, MediaType, OtherEventsType, ParticipantVisibility, RecurringType } from "../enum/event.enum";
import { Media, TeamInvitations } from "../interfaces/event.interface";
import { EventParticipantDto } from "./event-participants.dto";
import { EventEvaluationsDto } from "./event-evaluations.dto";

export class MediaDto implements Media {
    @ApiProperty()
    @IsString()
    url: string;

    @ApiProperty()
    @IsString()
    @IsIn([MediaType.IMAGE, MediaType.VIDEO])
    type: MediaType;
}

export class TeamInvitationsDto implements TeamInvitations {
    @ApiProperty({
        example: 'leAaodw2R23RT6FqHg4i'
    })
    @IsString()
    @IsNotEmpty()
    @IsDefined()
    teamId: string;

    @ApiProperty({
        example: ['35712bd6-c00c-4c6c-a6d7-8d836e8a2e93', '92c36bde-155c-4ec1-9b95-f153878d0435']
    })
    @IsString({ each: true })
    invitedUsers: string[];
}

export class EventDto {
    @ApiProperty({
        description: "Type Of Event (e.g. meeting, personal_training,group_training,camp, seminar, cup, series,other)",
        enum: OtherEventsType,
    })
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    @IsIn([OtherEventsType.MEETING,
    OtherEventsType.PERSONAL_TRAINING,
    OtherEventsType.GROUP_TRAINING,
    OtherEventsType.CAMP,
    OtherEventsType.SEMINAR,
    OtherEventsType.CUP,
    OtherEventsType.SERIES,
    OtherEventsType.OTHER])
    type: OtherEventsType

    @ApiProperty({
        description: 'Title of the Event',
        example: 'Team Match Event',
        maxLength: 100,
        minLength: 1,
    })
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    title: string;

    @ApiProperty({
        description: 'Description of the event',
        example: 'Event description goes here',
        maxLength: 500,
        minLength: 1,
    })
    @IsString()
    description: string;

    @ApiPropertyOptional({
        description: 'Media associated with the event',
        example: [{
            "url": "https://firebasestorage.googleapis.com/v0/b/zporter-dev.appspot.com/o/media%2F2025-04-20%2010:18:43.796663?alt=media&token=914a2677-a434-437a-8420-b1f901fd9d77",
            "type": "IMAGE"
        }],
        type: MediaDto,
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @ValidateNested()
    media: MediaDto[];

    @ApiProperty({
        description: 'Indicates if the event is private',
        example: false,
        default: true,
    })
    @IsNotEmpty()
    @IsBoolean()
    isPrivate: boolean;

    @ApiProperty({
        description: 'Indicates if the event should send a notification',
        example: true,
        default: false,
    })
    @IsNotEmpty()
    @IsBoolean()
    sendNotification: boolean;

    @ApiProperty({
        description: 'Send Invitation To Opponent Team?',
        default: true
    })
    @IsBoolean()
    isSendInviteToOpponent: boolean

    @ApiProperty({
        description: 'Send Invitation to Participants',
        default: true
    })
    @IsBoolean()
    isSendInvitations: boolean;

    @ApiProperty({
        description: 'Type of recurrence for the event',
        enum: RecurringType,
        example: RecurringType.ONCE,
    })
    @IsNotEmpty()
    recurringType: RecurringType = RecurringType.ONCE;

    @ApiProperty({
        description: 'Match Start Time',
        example: '10:30',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'time must be in the format HH:MM',
    })
    matchStart: string

    @ApiPropertyOptional({
        description: 'Notification time in minutes before the event starts',
        example: 10,
        default: 0,
    })
    @IsNotEmpty()
    @IsNumber()
    notificationMinute: number;

    @ApiProperty({
        description: 'Start date and time of the event',
        example: DateUtil.prototype.getNowDate(),
    })
    @IsDate()
    @MinDate(DateUtil.prototype.getNowDate())
    @Type(() => Date)
    startDate: Date | number;

    @ApiProperty({
        description: 'End date and time of the event',
        example: DateUtil.prototype.getNowDate(),
    })
    @IsDate()
    @MinDate(DateUtil.prototype.getNowDate())
    @Type(() => Date)
    endDate: Date | number;

    @ApiPropertyOptional({
        description: 'End date and time for recurring event',
        example: DateUtil.prototype.getNowDate(),
    })
    @IsDate()
    @MinDate(new Date())
    @Type(() => Date)
    untilDate?: Date | number;

    @ApiPropertyOptional({
        description: 'Event Until Date for recurring event or End date for non-recurring event',
        example: DateUtil.prototype.getNowDate(),
    })
    @IsDate()
    @MinDate(new Date())
    @Type(() => Date)
    effectiveEndDate?: Date | number;

    @ApiPropertyOptional({
        description: 'Location of the event',
        example: 'Hanoi, Vietnam',
    })
    location?: string;

    @ApiPropertyOptional({
        description: 'Array of invited users by their Zporter user IDs',
        type: [String],
        example: ['008a5eab-1837-4121-8975-9ec94059b165', '026d9e56-9ab0-48d6-b906-0efbcf77c806'],
    })
    @IsString({ each: true })
    @IsOptional()
    invitedUsers?: string[]; // Array of Zporter user IDs

    @ApiProperty({
        enum: MatchSide
    })
    @IsString()
    @IsIn([MatchSide.HOME, MatchSide.AWAY])
    matchSide: MatchSide

    @ApiProperty({
        enum: MatchCategory
    })
    @IsString()
    @IsIn([MatchCategory.CUP, MatchCategory.SERIES])
    matchCategory: MatchCategory

    @ApiProperty({
        description: 'Series Name',
        example: 'Champion League Cup'
    })
    @IsString()
    cupSeriesName: string

    @ApiProperty({
        description: 'Match Arena Where Match will be played',
        example: 'My Dinh Stadium'
    })
    @IsString()
    matchArena: string

    @ApiProperty({
        description: 'Duration of Minutes',
        example: '40'
    })
    @IsNumber()
    matchLength: number

    @ApiPropertyOptional({
        description: 'Opponent Team ID',
        example: 'jlN7o1DpG91Cuyj5PkMj'
    })
    @IsOptional()
    @IsString()
    @IsDefined()
    opponentTeamId: string

    @ApiProperty({
        description: 'Opponent Club ID',
        example: 'phL7vvhFwA3K3jrmN3ha'
    })
    @IsString()
    @IsNotEmpty()
    @IsDefined()
    opponentClubId: string

    @ApiProperty({
        enum: ParticipantVisibility,
        default: 'all',
        description: 'Visibility of participants in the event. Determines who can see the participant list.',
    })
    @IsOptional()
    @IsEnum(ParticipantVisibility)
    participantVisibility: ParticipantVisibility;

    @ApiProperty({
        description: 'Invitations for teams to the event',
        type: [TeamInvitationsDto],
        example: [{
            teamId: 'leAaodw2R23RT6FqHg4i',
            invitedUsers: ['35712bd6-c00c-4c6c-a6d7-8d836e8a2e93', '92c36bde-155c-4ec1-9b95-f153878d0435']
        }],
        isArray: true,
        required: true,
    })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => TeamInvitationsDto)
    teamInvitations: TeamInvitationsDto[];

    @ApiProperty({
        description: 'Indicates if the event lasts all day',
        example: false,
        default: false,
    })
    @IsBoolean()
    isAllDay: boolean = false;

    @ApiProperty({
        description: 'Indicates if the event is gathering',
        example: false,
        default: false,
    })
    @IsBoolean()
    isGathering: boolean = false;

    @ApiProperty({
        description: 'Gathering minutes of the event',
        example: '30',
    })
    @ValidateIf(o => o.isGathering)
    @IsNotEmpty()
    @IsNumber()
    gatheringMinute: number = 0

    @ApiProperty({
        description: 'Indicates if the event is occupied',
        example: false,
        default: false,
    })
    @IsBoolean()
    isOccupied: boolean = false;

    @ApiPropertyOptional({
        description: 'Event Fee',
        example: 0,
        default: 0,
    })
    @ValidateIf(o => o.fee)
    @IsNotEmpty()
    @IsNumber()
    fee: number = 0;

    participants: EventParticipantDto[];
    evaluations: EventEvaluationsDto[];
}
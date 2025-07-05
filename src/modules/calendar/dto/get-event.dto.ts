import { ApiProperty, ApiPropertyOptional, IntersectionType, OmitType } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from "class-validator";
import * as moment from 'moment';
import { PaginationDto } from "../../../common/pagination/pagination.dto";
import { UserTypes } from "../../users/enum/user-types.enum";
import { EventVisibility, FilterEventsType } from "../enum/event.enum";
import { AttendanceStatus, InviteStatus } from "../enum/participants.enum";
import { IsGreaterThen } from "../validators/is-greater-then";
import { IsLesserThen } from "../validators/is-less-then";
import { EventEvaluationsDto } from "./event-evaluations.dto";
import { EventDto } from "./event.dto";

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
    @IsString()
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

    @ApiProperty({
        enum: InviteStatus,
        default: 'invited',
        description: 'Status of the invite for the participant',
        example: 'invited | accepted | declined | maybe',
    })
    @IsNotEmpty()
    @IsString()
    status: InviteStatus = InviteStatus.INVITED;

    @ApiProperty({
        enum: AttendanceStatus,
        default: 'pending',
        description: 'Status of the participant\'s attendance',
        example: 'pending | present | absent | late | excused',
    })
    @IsString()
    attendanceStatus: AttendanceStatus;

    @ApiPropertyOptional({
        type: Date,
        description: 'Timestamp when the user last changed their invite status',
        example: '2023-10-01T12:00:00Z',
    })
    @IsOptional()
    @IsString()
    rsvpAt?: Date;

    @ApiProperty({
        description: 'Zporter user ID of the user who added this participant',
        example: '0987654321',
    })
    @IsString()
    addedById: string;
}

export class GetEventsList extends OmitType(PaginationDto, ['userIdQuery']) {

    @ApiProperty({ enum: FilterEventsType, default: FilterEventsType.ALL })
    @IsNotEmpty()
    type: FilterEventsType;

    @ApiProperty({ enum: EventVisibility, default: EventVisibility.ALL })
    @IsEnum(EventVisibility)
    @IsNotEmpty()
    visibility: EventVisibility;

    @ApiPropertyOptional({ default: moment.utc().format('YYYY-MM-DD') })
    @IsOptional()
    @IsDateString()
    @ValidateIf(o => o.endDate)
    @IsGreaterThen('date', 'endTime', { message: 'Start time must be before end time' })
    startDate: Date;

    @ApiPropertyOptional({ default: moment.utc().add(1, 'day').format('YYYY-MM-DD') })
    @IsOptional()
    @IsDateString()
    @ValidateIf(o => o.startDate)
    @IsLesserThen('date', 'startTime', { message: 'End time must be after start time' })
    untilDate: Date;
}

export class GetMonthlyEventsList extends IntersectionType(OmitType(GetEventsList, ['startDate', 'startAfter', 'untilDate']), OmitType(PaginationDto, ['userIdQuery', 'startAfter'])) {

    @ApiPropertyOptional({ default: 3 })
    limit: number;
    // @ApiProperty({
    //     description: 'Month for which to retrieve events',
    //     example: 6,
    //     // minimum: 1,
    //     // maximum: 12,
    // })
    // @IsNotEmpty()
    // @IsNumber()
    // @Type(() => Number)
    // @Min(1)
    // @Max(12)
    // month: number;

    // @ApiProperty({
    //     description: 'Year for which to retrieve events',
    //     example: 2025,
    //     minimum: 2000,
    //     maximum: 2100,
    // })
    // @IsNotEmpty()
    // @IsNumber()
    // @Type(() => Number)
    // @Min(2000)
    // @Max(2100)
    // year: number;
}

export class GetMultipleEventsDto extends OmitType(EventDto, ['participants'] as const) {
    @ApiProperty({
        description: 'Unique identifier for the reminder event',
        example: '1234567890abcdef',
    })
    id: string;

    @ApiProperty({
        description: 'List of invited users for the reminder event',
        type: [InvitedUsers],
        required: false,
    })
    participants?: InvitedUsers[];
    organizer?: InvitedUsers;
    evaluations: EventEvaluationsDto[];
}

export class GetSingleEventDto extends OmitType(EventDto, ['participants'] as const) {
    @ApiProperty({
        description: 'Unique identifier for the reminder event',
        example: '1234567890abcdef',
    })
    id: string;

    @ApiProperty({
        description: 'List of invited users for the reminder event',
        type: [InvitedUsers],
        required: false,
    })
    participants?: InvitedUsers[];
    organizer?: InvitedUsers;
    evaluations: EventEvaluationsDto[];
}

export class GetEventCommentDto extends OmitType(PaginationDto, ['userIdQuery', 'sorted', 'startAfter'] as const) {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    startAfterDocId?: string;
}
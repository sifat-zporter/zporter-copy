import { ApiProperty, ApiPropertyOptional, IntersectionType, PartialType } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { AttendanceStatus, InviteStatus, Role } from "../enum/participants.enum";
import { ParticipantsAttendance, ParticipantsStatus } from "../interfaces/participant.interface";
import { user } from "firebase-functions/v1/auth";
import { MediaDto } from "./event.dto";


export class EventParticipantDto {

   @ApiProperty({
      description: 'Zporter user ID of the participant',
      example: '1234567890',
   })
   @IsString()
   userId: string;

   @ApiProperty({
      description: 'Denormalized display name of the participant',
      example: 'John Doe',
   })
   name: string;

   @ApiProperty({
      enum: Role,
      description: 'Role of the participant in the event',
      example: 'organizer | coach | player | guest',
   })
   @IsNotEmpty()
   @IsString()
   role: Role;

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
   @IsDateString()
   @IsOptional()
   @IsString()
   rsvpAt?: Date | string;

   @ApiProperty({
      description: 'Zporter user ID of the user who added this participant',
      example: '0987654321',
   })
   @IsString()
   addedById: string;
}

export class InvitationUpdateDto {
   @ApiPropertyOptional({
      description: 'Whether to automatically accept similar events for this participant',
      default: false,
   })
   @IsOptional()
   @IsBoolean()
   autoAcceptSimilarEvents?: boolean;

   @ApiPropertyOptional({
      description: 'Notification time in minutes before the event starts',
      example: 10,
      default: 0,
   })
   @IsNotEmpty()
   @IsNumber()
   notificationMinutes?: number;

   @ApiPropertyOptional({
      description: 'Custom Note for the participant',
      example: 'Looking forward to seeing you at the event!',
   })
   @IsOptional()
   @IsString()
   message?: string;

   @ApiPropertyOptional({
      description: 'Reason for declining the invite, if applicable',
      example: 'I have a prior commitment.',
   })
   @IsOptional()
   @IsString()
   declineReason?: string;

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
}

export class UpdateEventParticipantDto extends IntersectionType(PartialType(EventParticipantDto), InvitationUpdateDto) {
}

export class UserStatusDto extends InvitationUpdateDto {
   @ApiProperty({
      enum: InviteStatus,
      description: 'Status of the invite for the participant',
      example: 'invited | accepted | declined | maybe',
   })
   @IsNotEmpty()
   @IsString()
   @IsIn(Object.values(InviteStatus))
   status: InviteStatus = InviteStatus.INVITED;

   @ApiPropertyOptional({
      description: 'Whether to automatically accept similar events for this participant',
      default: false,
   })
   @IsOptional()
   @IsBoolean()
   autoAcceptSimilarEvents?: boolean;

   @ApiPropertyOptional({
      description: 'Notification time in minutes before the event starts',
      example: 10,
      default: 0,
   })
   @IsOptional()
   @IsNotEmpty()
   @IsNumber()
   notificationMinutes?: number;

   @ApiPropertyOptional({
      description: 'Custom Note for the participant',
      example: 'Looking forward to seeing you at the event!',
   })
   @IsOptional()
   @IsString()
   message?: string;

   @ApiPropertyOptional({
      description: 'Reason for declining the invite, if applicable',
      example: 'I have a prior commitment.',
   })
   @IsOptional()
   @IsString()
   declineReason?: string;

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
   media: MediaDto[];

   @ApiPropertyOptional({
      description: 'Whether to send a notification to the participant about the event',
      default: true,
   })
   @IsOptional()
   @IsBoolean()
   @IsNotEmpty()
   sendNotification: boolean;
}

export class UserAttendanceDto implements ParticipantsAttendance {
   @ApiProperty({
      description: 'Zporter user ID of the participant',
      example: '1234567890',
   })
   @IsNotEmpty()
   @IsString()
   userId: string;

   @ApiProperty({
      enum: AttendanceStatus,
      description: 'Status of the participant\'s attendance',
      example: 'pending | present | absent | late | excused',
   })
   @IsNotEmpty()
   @IsString()
   @IsIn(Object.values(AttendanceStatus))
   attendanceStatus: AttendanceStatus;
}
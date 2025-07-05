import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import {
  PaginationDto,
  SortBy,
} from '../../../common/pagination/pagination.dto';
import { Role } from '../../diaries/enum/diaries.enum';
import { NotificationType } from '../../notifications/dto/notifications.req.dto';
import { UserTypes } from '../../users/enum/user-types.enum';

export enum TeamMemberType {
  ALL = 'ALL',
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

export const commonConstants = {
  LIMIT_USERNAME: 4,
  LIMIT_USER_IMAGES: 4,
};

export class SearchTeamMemberQuery extends OmitType(PaginationDto, [
  'startAfter',
] as const) {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startAfter?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty({ enum: TeamMemberType })
  @IsEnum(TeamMemberType)
  memberType: TeamMemberType;
}

export enum TeamTab {
  REQUEST = 'REQUEST',
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  BLOCK = 'BLOCK',
}

export enum BlockTeamType {
  BLOCK_MEMBER = 'BLOCK_MEMBER',
  BLOCK_TEAM = 'BLOCK_TEAM',
}

export class GetTeamByIdQuery implements PaginationDto {
  @ApiProperty({ default: 10 })
  limit: number;

  @ApiProperty({ enum: TeamTab })
  @IsEnum(TeamTab)
  tab: TeamTab;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0, { message: 'The number of page size must be greater than 0!' })
  startAfter?: number;

  @ApiPropertyOptional({ enum: SortBy, default: SortBy.ASC })
  @IsOptional()
  @IsEnum(SortBy)
  sorted?: SortBy;

  @ApiPropertyOptional({ enum: Role, default: Role.CAM })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class GetListTeamQuery extends OmitType(PaginationDto, [
  'startAfter',
] as const) {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startAfter?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clubId?: string;
}

export enum JoinTeamStatus {
  INVITED = 'INVITED',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export class CreateTeamSignUpDto {
  @ApiProperty()
  @IsString()
  teamName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamImage?: string;

  @ApiProperty()
  @IsUUID(4, { message: 'roleId must be UUIDv4' })
  roleId: string;

  @ApiProperty()
  @IsString()
  clubId: string;
}

export class CreateTeamDto {
  @ApiProperty()
  @IsString()
  teamName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ each: true })
  memberIds?: string[];

  @ApiProperty({ default: true })
  @IsBoolean()
  isPrivate: boolean;
}

export class MemberResponseInvitationQuery {
  @ApiProperty({
    enum: [JoinTeamStatus.ACCEPTED, JoinTeamStatus.REJECTED],
    default: JoinTeamStatus.ACCEPTED,
  })
  @IsEnum(JoinTeamStatus)
  status: JoinTeamStatus;

  @ApiProperty({
    enum: TeamMemberType,
    default: TeamMemberType.MEMBER,
  })
  @IsEnum(TeamMemberType)
  memberType: TeamMemberType;
}

export class UpdateTeamDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamImage?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ each: true })
  memberIds?: string[];
}

export class UpdateMemberDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ each: true })
  memberIds?: string[];

  @ApiProperty({ enum: TeamMemberType, default: TeamMemberType.MEMBER })
  @IsEnum(TeamMemberType)
  memberType?: TeamMemberType;
}

export class ChangeStatusJoinTeamDto {
  @ApiProperty()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  memberIds: string[];
}

export class ChangeStatusJoinTeamQuery {
  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiProperty({
    enum: [JoinTeamStatus.ACCEPTED, JoinTeamStatus.REJECTED],
    default: JoinTeamStatus.ACCEPTED,
  })
  @IsEnum(JoinTeamStatus)
  status: JoinTeamStatus;
}
export class InviteMembersDto {
  @ApiProperty()
  @IsString({ each: true })
  memberIds: string[];
}

export class BlockMemberTeamDto {
  @ApiProperty()
  @IsString()
  memberId: string;

  @ApiProperty()
  @IsString()
  teamId: string;
}

export class UnblockMembersTeamDto {
  @ApiProperty()
  @IsString({ each: true })
  memberIds: string[];

  @ApiProperty()
  @IsString()
  teamId: string;
}

export enum TeamContactTab {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

export enum MemberType {
  NOT_A_MEMBER = 'NOT_A_MEMBER',
  PENDING = 'PENDING',
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

export enum MemberConfirm {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
}
export class GetAllMembersInTeam {
  @ApiPropertyOptional({ enum: [UserTypes.COACH, UserTypes.PLAYER] })
  @IsOptional()
  @IsEnum(UserTypes)
  userType?: UserTypes;
}

export class DeleteMemberInATeam {
  @ApiProperty()
  @IsString()
  memberId: string;

  @ApiProperty()
  @IsString()
  teamId: string;
}

export class BlockMemberInATeam extends DeleteMemberInATeam {}

export class ConfirmBlockOrDeleteFromTeamQuery {
  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiPropertyOptional({
    description:
      'owner or admin confirm that they mistake or not. Send memberId',
  })
  @IsString()
  @IsOptional()
  memberId?: string;

  @ApiProperty({ enum: MemberConfirm })
  memberConfirm: MemberConfirm;

  @ApiProperty({ enum: TeamMemberType })
  oldMemberType: TeamMemberType;

  @ApiProperty({
    enum: [
      NotificationType.ADMIN_CONFIRM_DELETE_MEMBER_TEAM,
      NotificationType.ADMIN_CONFIRM_BLOCK_MEMBER_TEAM,
      NotificationType.MEMBER_CONFIRM_DELETE_MEMBER_TEAM,
      NotificationType.MEMBER_CONFIRM_BLOCK_MEMBER_TEAM,
    ],
  })
  @IsEnum(NotificationType)
  confirmType: NotificationType;
}

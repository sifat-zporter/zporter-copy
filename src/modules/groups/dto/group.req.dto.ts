import { CountryDto } from './../../../common/dto/country.dto';
import { defaultCountry } from './../../../common/constants/country';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../common/pagination/pagination.dto';
import { Type } from 'class-transformer';

export const commonConstants = {
  LIMIT_USERNAME: 4,
  LIMIT_USER_IMAGES: 4,
};

export enum JoinGroupStatus {
  INVITED = 'INVITED',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum GroupTab {
  REQUEST = 'REQUEST',
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  BLOCK = 'BLOCK',
}

export enum GroupMemberType {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

export enum BlockGroupType {
  BLOCK_MEMBER = 'BLOCK_MEMBER',
  BLOCK_GROUP = 'BLOCK_GROUP',
}

export class CreateGroupDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  groupImage?: string;

  @ApiProperty()
  @IsString({ each: true })
  @ArrayMinSize(1)
  memberIds: string[];

  @ApiProperty({ default: true })
  @IsBoolean()
  isPrivate: boolean;

  @ApiPropertyOptional({
    default: defaultCountry,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CountryDto)
  country: CountryDto;
}

export class UpdateGroupDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  groupImage?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @ApiPropertyOptional()
  @IsString({ each: true })
  @IsOptional()
  memberIds: string[];
}

export class UpdateMemberDto {
  @ApiProperty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  memberIds: string[];

  @ApiProperty({ enum: GroupMemberType, default: GroupMemberType.MEMBER })
  @IsEnum(GroupMemberType)
  memberType?: GroupMemberType;
}

export class SearchGroupMemberQuery extends OmitType(PaginationDto, [
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

  @ApiProperty({ enum: GroupMemberType })
  @IsEnum(GroupMemberType)
  memberType: GroupMemberType;
}

export class GetGroupByIdQuery extends PaginationDto {
  @ApiProperty({ enum: GroupTab })
  @IsEnum(GroupTab)
  tab: GroupTab;
}

export class GetListGroupQuery extends OmitType(PaginationDto, [
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
}

export class ChangeStatusJoinGroup {
  @ApiProperty()
  @IsString()
  groupId: string;

  @ApiProperty({
    enum: [JoinGroupStatus.ACCEPTED, JoinGroupStatus.REJECTED],
    default: JoinGroupStatus.ACCEPTED,
  })
  @IsEnum(JoinGroupStatus)
  status: JoinGroupStatus;
}

export class MemberResponseInvitationQuery {
  @ApiProperty({
    enum: [JoinGroupStatus.ACCEPTED, JoinGroupStatus.REJECTED],
    default: JoinGroupStatus.ACCEPTED,
  })
  @IsEnum(JoinGroupStatus)
  status: JoinGroupStatus;

  @ApiProperty({
    enum: GroupMemberType,
    default: GroupMemberType.MEMBER,
  })
  @IsEnum(GroupMemberType)
  memberType: GroupMemberType;
}

export class ChangeStatusJoinGroupDto {
  @ApiProperty()
  @IsString({ each: true })
  memberIds: string[];
}

export class InviteMembersDto {
  @ApiProperty()
  @IsString({ each: true })
  memberIds: string[];

  @ApiProperty({ enum: GroupMemberType, default: GroupMemberType.MEMBER })
  @IsEnum(GroupMemberType)
  memberType: GroupMemberType;
}

export class BlockMemberDto {
  @ApiProperty()
  @IsString()
  memberId: string;

  @ApiProperty()
  @IsString()
  groupId: string;
}

export class UnblockMembersDto {
  @ApiProperty()
  @IsString({ each: true })
  memberIds: string[];

  @ApiProperty()
  @IsString()
  groupId: string;
}

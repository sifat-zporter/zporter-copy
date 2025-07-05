import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/pagination/pagination.dto';
import { AgeGroup } from '../../dashboard/dto/dashboard.req.dto';
import { UserTypes } from './../../users/enum/user-types.enum';

export enum ContactTab {
  ALL = 'ALL',
  GROUPS = 'GROUPS',
  GROUPS_NAME = 'GROUPS_NAME',
  FANS = 'FANS',
  TEAM = 'TEAM',
  FOLLOWERS = 'FOLLOWERS',
  FRIENDS = 'FRIENDS',
  BLOCKED = 'BLOCKED',
  TEAMMATES = 'TEAMMATES',
  FAMILY = 'FAMILY',
}

export enum CreatedAtSort {
  NEW = 'NEW',
  OLD = 'OLD',
}

export class GetListContactQuery extends PaginationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ enum: ContactTab })
  @IsEnum(ContactTab)
  tab: ContactTab;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clubId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional({ enum: AgeGroup, default: AgeGroup.B_2002 })
  @IsOptional()
  // @IsEnum(AgeGroup)
  ageGroup?: AgeGroup;

  @ApiPropertyOptional()
  @IsEnum(CreatedAtSort)
  @IsOptional()
  signUpDateSort?: CreatedAtSort;

  @ApiPropertyOptional({
    enum: [UserTypes.COACH, UserTypes.PLAYER, UserTypes.SUPPORTER],
    default: UserTypes.PLAYER,
  })
  @IsEnum(UserTypes)
  @IsOptional()
  role?: UserTypes;
}

export class GetPublicListContactQuery extends OmitType(GetListContactQuery, [
  'tab',
] as const) {
  @ApiProperty({ enum: [ContactTab.TEAM, ContactTab.GROUPS] })
  @IsEnum(ContactTab)
  tab: ContactTab;
}

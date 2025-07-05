import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  NotEquals,
} from 'class-validator';
import { GenderTypes } from '../../../common/constants/common.constant';
import { SortBy } from '../../../common/pagination/pagination.dto';
import { Age, AgeGroup } from '../../dashboard/dto/dashboard.req.dto';
import { Role } from '../../diaries/enum/diaries.enum';
import { UserTypes } from '../../users/enum/user-types.enum';

export class QueryBioForFlippingDto {
  @ApiPropertyOptional()
  username?: string;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @IsInt()
  pageNumber: number;

  @ApiProperty({ default: 10 })
  @Type(() => Number)
  @IsInt()
  pageSize: number;

  @ApiProperty()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  startAfter?: number;

  @ApiProperty()
  @Type(() => String)
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clubId?: string;

  @ApiPropertyOptional({ enum: UserTypes, default: UserTypes.PLAYER })
  @IsOptional()
  // @IsEnum(UserTypes)
  role?: UserTypes;

  //# TODO: fix check enum of AgeGroup
  @ApiPropertyOptional({ enum: Age, default: Age.ADULT })
  @IsOptional()
  age?: Age;

  @ApiPropertyOptional({ enum: GenderTypes, default: '' })
  @IsOptional()
  // @IsEnum(UserTypes)
  gender?: GenderTypes;

  //# TODO: fix check enum of AgeGroup
  @ApiPropertyOptional({ enum: SortBy, default: SortBy.ASC })
  @IsEnum(SortBy)
  @IsOptional()
  sortBy?: SortBy;
}

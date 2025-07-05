import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SortBy } from '../../../../../common/pagination/pagination.dto';
import { AgeGroup } from '../../../../dashboard/dto/dashboard.req.dto';
import { LastDateRange } from '../../../../dashboard/enum/dashboard-enum';
import { Role } from '../../../../diaries/enum/diaries.enum';

export class GetLeaderboardRequest {
  @ApiProperty()
  @IsString()
  @IsMongoId()
  testId: string;

  @ApiProperty({ enum: LastDateRange, default: LastDateRange.SEVEN_DAY })
  @IsEnum(LastDateRange)
  lastDateRange: LastDateRange;

  @ApiProperty({ default: 10 })
  @Type(() => Number)
  @Max(20, { message: 'limit must be less than 20 !' })
  @Min(1, { message: 'limit must be more than 0 !' })
  limit: number;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @Min(1, { message: 'startAfter must be more than 0 !' })
  startAfter: number;

  @ApiProperty({ enum: SortBy, default: SortBy.ASC })
  @IsEnum(SortBy)
  sorted: SortBy;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ enum: AgeGroup, default: AgeGroup.B_2002 })
  @IsOptional()
  // @IsEnum(AgeGroup)
  ageGroup?: AgeGroup;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clubId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional({ enum: Role, default: '' })
  @IsOptional()
  role?: Role;
}

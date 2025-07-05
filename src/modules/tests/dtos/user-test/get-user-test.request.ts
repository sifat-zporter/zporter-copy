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
import { SortBy } from '../../../../common/pagination/pagination.dto';
import { LastDateRange } from '../../../dashboard/enum/dashboard-enum';

export class GetUserTestRequest {
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
  // @Max(20, { message: 'startAfter must be less than 20 !' })
  @Min(1, { message: 'startAfter must be more than 0 !' })
  startAfter: number;

  @ApiProperty({ enum: SortBy, default: SortBy.ASC })
  @IsEnum(SortBy)
  sorted: SortBy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userIdQuery?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { SortBy } from '../../../../common/pagination/pagination.dto';

export class GetExercisesDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty({ default: 10 })
  @Type(() => Number)
  @Min(1, { message: 'The number of page size must be greater than 0' })
  limit: number;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @Min(1, { message: 'The page must be greater than 0' })
  startAfter: number;

  @ApiPropertyOptional({ enum: SortBy, default: SortBy.ASC })
  @IsOptional()
  @IsEnum(SortBy)
  sorted?: SortBy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userIdQuery?: string;
}

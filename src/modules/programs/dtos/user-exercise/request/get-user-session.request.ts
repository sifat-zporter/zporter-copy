import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, Max, Min } from 'class-validator';
import { SortBy } from '../../../../../common/pagination/pagination.dto';

export class GetUserSessionRequest {
  @ApiProperty({ default: 10 })
  @Type(() => Number)
  @Max(99, { message: 'limit must be less than 99 !' })
  @Min(1, { message: 'limit must be more than 0 !' })
  limit: number;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @Min(1, { message: 'startAfter must be more than 0 !' })
  startAfter: number;

  @ApiProperty({ enum: SortBy, default: SortBy.ASC })
  @IsEnum(SortBy)
  sorted: SortBy;

  @ApiProperty()
  @IsMongoId()
  programId: string;
}

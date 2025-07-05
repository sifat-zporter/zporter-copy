import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { LastDateRange } from '../../../../dashboard/enum/dashboard-enum';

export class GetIndividualChartRequest {
  @ApiProperty()
  @IsString()
  @IsMongoId()
  testId: string;

  @ApiProperty({ enum: LastDateRange, default: LastDateRange.ONE_YEAR })
  @IsEnum(LastDateRange)
  lastDateRange: LastDateRange;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userIdQuery?: string;
}

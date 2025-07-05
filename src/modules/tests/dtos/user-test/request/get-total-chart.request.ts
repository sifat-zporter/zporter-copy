import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { LastDateRange } from '../../../../dashboard/enum/dashboard-enum';
import { TestType } from '../../../enums/test-type';

export class GetTotalChartRequest {
  @IsEnum(TestType)
  @ApiProperty()
  testType: TestType;

  @ApiProperty({ enum: LastDateRange, default: LastDateRange.ONE_YEAR })
  @IsEnum(LastDateRange)
  lastDateRange: LastDateRange;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userIdQuery?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LastMonthRange } from '../../dashboard/enum/dashboard-enum';

export enum HealthChartType {
  BMI = 'BMI',
  BODY_FAT = 'BODY_FAT',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  HEIGHT = 'HEIGHT',
  WEIGHT = 'WEIGHT',
  PULSE = 'PULSE',
  REST_PULSE = 'REST_PULSE',
  MAX_PULSE = 'MAX_PULSE',
  DIASTOLIC_BLOOD_PRESSURE = 'DIASTOLIC_BLOOD_PRESSURE',
  SYSTOLIC_BLOOD_PRESSURE = 'SYSTOLIC_BLOOD_PRESSURE',
}

export class GetHealthChartQuery {
  @ApiProperty({ type: LastMonthRange })
  @IsEnum(LastMonthRange)
  lastMonthRange: LastMonthRange;

  @ApiProperty({
    enum: [
      HealthChartType.BMI,
      HealthChartType.BODY_FAT,
      HealthChartType.WEIGHT,
      HealthChartType.HEIGHT,
      HealthChartType.BLOOD_PRESSURE,
      HealthChartType.PULSE,
    ],
  })
  @IsEnum(HealthChartType)
  healthChartType: HealthChartType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userIdQuery?: string;
}

import { IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Pressure } from './pressure.dto';

export class BloodPressureRecordDto {
  @ValidateNested()
  @Type(() => Pressure)
  systolic: Pressure;

  @ValidateNested()
  @Type(() => Pressure)
  diastolic: Pressure;

  @IsDateString()
  time: string;

  @IsOptional()
  zoneOffset?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

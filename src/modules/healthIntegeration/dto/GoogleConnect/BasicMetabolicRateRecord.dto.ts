import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BasalMetabolicRate {
  @IsNumber()
  value: number;

  @IsString()
  unit: 'kcal_per_hour';
}

export class BasalMetabolicRateRecordDto {
  @IsDateString()
  time: string;

  @ValidateNested()
  @Type(() => BasalMetabolicRate)
  basalMetabolicRate: BasalMetabolicRate;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

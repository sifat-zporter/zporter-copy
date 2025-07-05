import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class BloodPressureSystolicDto {
  @IsIn(['BloodPressureSystolic'])
  type: 'BloodPressureSystolic';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // "mmHg"

  @IsISO8601()
  timestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  userId: string;
}

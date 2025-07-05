import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
export class BloodGlucoseDto {
  @IsIn(['BloodGlucose'])
  type: 'BloodGlucose';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // e.g., "mg/dL" or "mmol/L"

  @IsISO8601()
  timestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: {
    mealContext?: string; // e.g., fasting, post-meal
  };

  @IsString()
  userId: string;
}

import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class TriglyceridesDto {
  @IsIn(['Triglycerides'])
  type: 'Triglycerides';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // usually "mg/dL"

  @IsISO8601()
  timestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: {
    fasting?: boolean;
  };

  @IsString()
  userId: string;
}

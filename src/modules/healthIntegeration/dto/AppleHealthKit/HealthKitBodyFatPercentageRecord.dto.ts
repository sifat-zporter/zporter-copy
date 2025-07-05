import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class BodyFatPercentageDto {
  @IsIn(['BodyFatPercentage'])
  type: 'BodyFatPercentage';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // usually "%"

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

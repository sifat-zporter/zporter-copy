import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class RespiratoryRateDto {
  @IsIn(['RespiratoryRate'])
  type: 'RespiratoryRate';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // "count/min"

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

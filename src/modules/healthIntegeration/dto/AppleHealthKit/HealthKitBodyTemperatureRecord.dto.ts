import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class BodyTemperatureDto {
  @IsIn(['BodyTemperature'])
  type: 'BodyTemperature';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // "°C" or "°F"

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

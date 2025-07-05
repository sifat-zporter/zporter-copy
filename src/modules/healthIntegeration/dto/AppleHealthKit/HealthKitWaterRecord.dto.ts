import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class WaterDto {
  @IsIn(['Water'])
  type: 'Water';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // usually "ml"

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

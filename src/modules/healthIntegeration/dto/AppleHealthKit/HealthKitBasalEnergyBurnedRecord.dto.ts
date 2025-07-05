import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class BasalEnergyBurnedDto {
  @IsIn(['BasalEnergyBurned'])
  type: 'BasalEnergyBurned';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // usually "kcal"

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

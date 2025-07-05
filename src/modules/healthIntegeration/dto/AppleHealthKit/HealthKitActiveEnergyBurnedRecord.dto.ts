import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ActiveEnergyBurnedDto {
  @IsIn(['ActiveEnergyBurned'])
  type: 'ActiveEnergyBurned';

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
  metadata?: {
    activityType?: string;
  };

  @IsString()
  userId: string;
}

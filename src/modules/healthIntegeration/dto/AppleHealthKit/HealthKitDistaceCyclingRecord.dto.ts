import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class DistanceCyclingDto {
  @IsIn(['DistanceCycling'])
  type: 'DistanceCycling';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // usually "m" or "km"

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

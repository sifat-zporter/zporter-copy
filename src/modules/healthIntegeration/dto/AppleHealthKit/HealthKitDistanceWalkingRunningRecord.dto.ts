import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class DistanceWalkingRunningDto {
  @IsIn(['DistanceWalkingRunning'])
  type: 'DistanceWalkingRunning';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // typically "m" or "km"

  @IsISO8601()
  timestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: {
    activityType?: string; // e.g., walking, running
  };

  @IsString()
  userId: string;
}

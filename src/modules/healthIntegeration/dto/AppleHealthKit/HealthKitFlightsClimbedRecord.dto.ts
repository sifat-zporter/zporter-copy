import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class FlightsClimbedDto {
  @IsIn(['FlightsClimbed'])
  type: 'FlightsClimbed';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // usually "count"

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

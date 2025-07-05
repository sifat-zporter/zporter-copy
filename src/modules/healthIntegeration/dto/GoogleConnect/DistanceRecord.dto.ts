import {
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Distance } from './distance.dto';

export class DistanceRecordDto {
  @ValidateNested()
  @Type(() => Distance)
  distance: Distance;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsString()
  startZoneOffset?: string;

  @IsOptional()
  @IsString()
  endZoneOffset?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

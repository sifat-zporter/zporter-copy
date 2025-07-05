// src/health/dto/GoogleConnect/ElevationGainedRecord.dto.ts
import {
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Elevation } from './elevation.dto';

export class ElevationGainedRecordDto {
  @ValidateNested()
  @Type(() => Elevation)
  elevationGained: Elevation;

  @IsDateString()
  startTime: string;

  @IsOptional()
  @IsString()
  startZoneOffset?: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsString()
  endZoneOffset?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

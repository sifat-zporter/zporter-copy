// src/health/dto/GoogleConnect/ExerciseSessionRecord.dto.ts
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ExerciseSessionRecordDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  exerciseType: string;

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

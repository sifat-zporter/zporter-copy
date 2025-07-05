import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CyclingPedalingCadenceRecordDto {
  @IsNumber()
  revolutionsPerMinute: number;

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

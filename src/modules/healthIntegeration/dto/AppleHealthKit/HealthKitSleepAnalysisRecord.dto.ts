import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SleepAnalysisDto {
  @IsIn(['SleepAnalysis'])
  type: 'SleepAnalysis';

  @IsString()
  value: 'asleep' | 'awake' | 'inBed';

  @IsISO8601()
  startTimestamp: string;

  @IsISO8601()
  endTimestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: {
    sleepStage?: string; // e.g., "light", "deep", "REM"
  };

  @IsString()
  userId: string;
}

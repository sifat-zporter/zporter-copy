import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class MoodDto {
  @IsIn(['Mood'])
  type: 'Mood';

  @IsString()
  value: string; // e.g., "happy", "sad", "anxious"

  @IsISO8601()
  timestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: {
    notes?: string;
  };

  @IsString()
  userId: string;
}

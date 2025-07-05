import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ExerciseTimeDto {
  @IsIn(['ExerciseTime'])
  type: 'ExerciseTime';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // e.g., "seconds" or "minutes"

  @IsISO8601()
  timestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: {
    exerciseType?: string;
  };

  @IsString()
  userId: string;
}

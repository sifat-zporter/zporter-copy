import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class MenstruationDto {
  @IsIn(['Menstruation'])
  type: 'Menstruation';

  @IsString()
  value: 'none' | 'light' | 'medium' | 'heavy';

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
    symptoms?: string[];
  };

  @IsString()
  userId: string;
}

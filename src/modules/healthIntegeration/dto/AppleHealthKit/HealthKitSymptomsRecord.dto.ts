import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SymptomsDto {
  @IsIn(['Symptoms'])
  type: 'Symptoms';

  @IsString()
  symptomName: string;

  @IsOptional()
  @IsString()
  severity?: 'mild' | 'moderate' | 'severe';

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

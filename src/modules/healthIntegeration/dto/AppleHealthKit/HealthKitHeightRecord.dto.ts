import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class HeightDto {
  @IsIn(['Height'])
  type: 'Height';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // "cm" or "in"

  @IsISO8601()
  timestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  userId: string;
}

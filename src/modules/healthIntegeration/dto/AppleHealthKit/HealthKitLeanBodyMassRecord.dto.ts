import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class LeanBodyMassDto {
  @IsIn(['LeanBodyMass'])
  type: 'LeanBodyMass';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // e.g., "kg" or "lb"

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

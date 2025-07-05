import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class BodyMassIndexDto {
  @IsIn(['BodyMassIndex'])
  type: 'BodyMassIndex';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // typically "count" or "kg/m²"

  @IsISO8601()
  timestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: {
    calculationMethod?: string; // e.g., "weight and height"
  };

  @IsString()
  userId: string;
}

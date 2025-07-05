import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class MedicationRecordDto {
  @IsIn(['MedicationRecord'])
  type: 'MedicationRecord';

  @IsString()
  medicationName: string;

  @IsNumber()
  dose: number;

  @IsString()
  unit: string; // e.g., "mg", "ml"

  @IsISO8601()
  timestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: {
    route?: string; // e.g., oral, injection
  };

  @IsString()
  userId: string;
}

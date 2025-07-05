import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class InsulinDeliveryDto {
  @IsIn(['InsulinDelivery'])
  type: 'InsulinDelivery';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // usually "units"

  @IsISO8601()
  timestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: {
    deliveryMethod?: string; // e.g., basal, bolus
  };

  @IsString()
  userId: string;
}

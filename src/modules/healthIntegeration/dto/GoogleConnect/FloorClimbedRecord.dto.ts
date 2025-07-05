import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class FloorValue {
  @IsNumber()
  value: number;

  @IsString()
  unit: string; // 'floors'
}

export class FloorsClimbedRecordDto {
  @ValidateNested()
  @Type(() => FloorValue)
  floors: FloorValue;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsString()
  startZoneOffset: string;

  @IsString()
  endZoneOffset: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

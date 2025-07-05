import { IsDateString, IsOptional, IsString } from 'class-validator';
import { Energy } from './energy.dto'; // Assuming Energy is another DTO

export class ActiveCaloriesBurnedRecordDto {
  energy: Energy;

  @IsDateString()
  startTime: string;

  @IsOptional()
  @IsString()
  startZoneOffset?: string;
  @IsDateString()
  endTime: string;
  @IsOptional()
  @IsString()
  endZoneOffset?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

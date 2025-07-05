// unified-health.dto.ts
import { IsEnum, IsObject } from 'class-validator';
import { HealthDataType } from './enum/HealthConnect.enum';

export class UnifiedHealthRecordDto {
  @IsEnum(HealthDataType)
  type: HealthDataType;

  @IsObject()
  data: any; // Will validate manually based on type
}

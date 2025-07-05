// src/health/dto/energy.dto.ts
import { IsNumber, IsString } from 'class-validator';

export class Energy {
  @IsNumber()
  value: number;

  @IsString()
  unit: string; // e.g., "kcal" or "J"
}

// src/health/dto/elevation.dto.ts
import { IsNumber, IsString } from 'class-validator';

export class Elevation {
  @IsNumber()
  value: number;

  @IsString()
  unit: string; // e.g., "meters"
}

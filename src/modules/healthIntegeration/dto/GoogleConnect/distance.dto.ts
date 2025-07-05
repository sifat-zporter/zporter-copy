import { IsNumber, IsString } from 'class-validator';

export class Distance {
  @IsNumber()
  value: number;

  @IsString()
  unit: string; // e.g., "m", "km"
}

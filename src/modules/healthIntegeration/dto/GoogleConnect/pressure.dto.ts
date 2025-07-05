import { IsNumber, IsString } from 'class-validator';

export class Pressure {
  @IsNumber()
  value: number;

  @IsString()
  unit: string; // should be "mmHg"
}

import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
export class FiberDto {
  @IsIn(['Fiber'])
  type: 'Fiber';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // usually "g"

  @IsISO8601()
  timestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: {
    mealType?: string;
    foodItem?: string;
  };

  @IsString()
  userId: string;
}

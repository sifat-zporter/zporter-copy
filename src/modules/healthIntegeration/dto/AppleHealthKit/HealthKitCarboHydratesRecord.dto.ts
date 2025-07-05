import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CarbohydratesDto {
  @IsIn(['Carbohydrates'])
  type: 'Carbohydrates';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // typically "g"

  @IsISO8601()
  timestamp: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  metadata?: {
    mealType?: string; // e.g., breakfast, lunch, snack
    foodItem?: string; // e.g., "Oatmeal"
  };

  @IsString()
  userId: string;
}

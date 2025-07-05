import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class DietaryEnergyDto {
  @IsIn(['DietaryEnergy'])
  type: 'DietaryEnergy';

  @IsNumber()
  value: number;

  @IsString()
  unit: string; // "kcal"

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

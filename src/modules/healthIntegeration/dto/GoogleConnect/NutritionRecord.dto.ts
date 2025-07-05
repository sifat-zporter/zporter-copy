import { Type } from 'class-transformer';
import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { MetadataDto } from './metadata.dto';

class Nutrition {
  @IsNumber()
  value: number;

  @IsString()
  unit: string;
}

export class NutritionRecordDto {
  @ValidateNested()
  @Type(() => Nutrition)
  nutrition: Nutrition;

  @IsString()
  time: string;

  @IsString()
  zoneOffset: string;

  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;
}

import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MetadataDto } from './metadata.dto';

class CaloriesDto {
  @IsNumber()
  value: number;

  @IsString()
  unit: string;
}

export class TotalCaloriesBurnedRecordDto {
  @ValidateNested()
  @Type(() => CaloriesDto)
  calories: CaloriesDto;

  @IsString()
  time: string;

  @IsString()
  zoneOffset: string;

  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;
}

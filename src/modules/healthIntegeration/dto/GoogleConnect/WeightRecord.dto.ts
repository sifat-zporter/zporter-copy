import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MetadataDto } from './metadata.dto';

class WeightDto {
  @IsNumber()
  value: number;

  @IsString()
  unit: string;
}

export class WeightRecordDto {
  @ValidateNested()
  @Type(() => WeightDto)
  weight: WeightDto;

  @IsString()
  time: string;

  @IsString()
  zoneOffset: string;

  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;
}

import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MetadataDto } from './metadata.dto';

class TemperatureDto {
  @IsNumber()
  value: number;

  @IsString()
  unit: string;
}

export class SkinTemperatureRecordDto {
  @ValidateNested()
  @Type(() => TemperatureDto)
  temperature: TemperatureDto;

  @IsString()
  time: string;

  @IsString()
  zoneOffset: string;

  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;
}

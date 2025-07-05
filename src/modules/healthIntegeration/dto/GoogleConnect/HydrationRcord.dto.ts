import { Type } from 'class-transformer';
import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { MetadataDto } from './metadata.dto';

class Volume {
  @IsNumber()
  value: number;

  @IsString()
  unit: string;
}

export class HydrationRecordDto {
  @ValidateNested()
  @Type(() => Volume)
  volume: Volume;

  @IsString()
  time: string;

  @IsString()
  zoneOffset: string;

  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;
}

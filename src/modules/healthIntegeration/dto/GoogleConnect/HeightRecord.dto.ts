import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MetadataDto } from './metadata.dto';

class Height {
  @IsNumber()
  value: number;

  @IsString()
  unit: string;
}

export class HeightRecordDto {
  @ValidateNested()
  @Type(() => Height)
  height: Height;

  @IsString()
  time: string;

  @IsString()
  zoneOffset: string;

  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;
}

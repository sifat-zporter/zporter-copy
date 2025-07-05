import { IsNumber, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { MetadataDto } from './metadata.dto';

class SpeedSampleDto {
  @IsString()
  time: string;

  @IsNumber()
  metersPerSecond: number;
}

export class SpeedRecordDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpeedSampleDto)
  samples: SpeedSampleDto[];

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsString()
  startZoneOffset: string;

  @IsString()
  endZoneOffset: string;

  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;
}

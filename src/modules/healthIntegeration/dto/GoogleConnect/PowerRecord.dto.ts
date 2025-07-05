import { Type } from 'class-transformer';
import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { MetadataDto } from './metadata.dto';

class PowerSampleDto {
  @IsString()
  time: string;

  @IsNumber()
  watts: number;
}

export class PowerRecordDto {
  @ValidateNested({ each: true })
  @Type(() => PowerSampleDto)
  samples: PowerSampleDto[];

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

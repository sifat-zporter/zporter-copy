import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MetadataDto } from './metadata.dto';

class SleepStageDto {
  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsString()
  stage: string;
}

export class SleepSessionRecordDto {
  @IsString()
  title: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsString()
  startZoneOffset: string;

  @IsString()
  endZoneOffset: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SleepStageDto)
  stages: SleepStageDto[];

  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;
}

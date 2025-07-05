import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MetadataDto } from './metadata.dto';

class StepsCadenceSampleDto {
  @IsString()
  time: string;

  @IsNumber()
  stepsPerMinute: number;
}

export class StepsCadenceRecordDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepsCadenceSampleDto)
  samples: StepsCadenceSampleDto[];

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

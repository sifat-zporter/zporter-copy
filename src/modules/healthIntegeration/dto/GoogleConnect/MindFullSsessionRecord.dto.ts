import { IsString, ValidateNested } from 'class-validator';
import { MetadataDto } from './metadata.dto';
import { Type } from 'class-transformer';

export class MindfulnessSessionRecordDto {
  @IsString()
  title: string;

  @IsString()
  notes: string;

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

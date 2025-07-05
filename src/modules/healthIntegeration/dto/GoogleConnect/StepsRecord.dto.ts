import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MetadataDto } from './metadata.dto';

export class StepsRecordDto {
  @IsNumber()
  count: number;

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

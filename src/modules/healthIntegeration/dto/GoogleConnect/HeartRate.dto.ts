import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class HeartRateSampleDto {
  @IsString()
  time: string;

  @IsNumber()
  beatsPerMinute: number;
}

export class HeartRateRecordDto {
  @ValidateNested({ each: true })
  @Type(() => HeartRateSampleDto)
  samples: HeartRateSampleDto[];

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsString()
  startZoneOffset: string;

  @IsString()
  endZoneOffset: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

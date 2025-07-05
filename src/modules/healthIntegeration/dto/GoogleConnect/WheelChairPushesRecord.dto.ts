import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WheelchairPushesRecordDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ type: Number, example: 150 })
  @IsNumber()
  count: number;

  @ApiProperty({ example: 'pushes' })
  @IsString()
  countUnit: string;

  @ApiProperty({ format: 'timezone', required: false })
  @IsOptional()
  @IsString()
  startZoneOffset?: string;

  @ApiProperty({ format: 'timezone', required: false })
  @IsOptional()
  @IsString()
  endZoneOffset?: string;

  @ApiProperty({ required: false, type: Object, additionalProperties: true })
  @IsOptional()
  metadata?: Record<string, any>;
}

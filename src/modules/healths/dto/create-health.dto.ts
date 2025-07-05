import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import * as moment from 'moment';
import { MediaDto } from '../../diaries/dto/diary.dto';

export class CreateHealthDto {
  @ApiPropertyOptional({
    example: moment().format('YYYY-MM-DDTHH:mm:ssZ'),
    description: 'Should be passing start of the(any) day + timezone',
  })
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  breastSkinThickness?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  waistSkinsThickness?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  thighSkinThickness?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  restingPulse?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPulse?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  systolicBloodPressure?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  diastolicBloodPressure?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  otherDescription?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MediaDto)
  media: MediaDto[];
}

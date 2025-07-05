import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Regex } from '../../../../../common/constants/regex';
import { MediaDto } from '../../../../diaries/dto/diary.dto';
import { Metric } from '../../../enums/metric';

export class UserTestRequest {
  @ApiProperty()
  @IsString()
  @IsMongoId()
  subtypeId: string;

  @ApiProperty()
  @IsString()
  @IsMongoId()
  testId: string;

  @ApiProperty({ example: 'Test Result' })
  @IsString()
  title: string;

  @ApiProperty()
  @IsNumber()
  value: number;

  @ApiProperty()
  // { default: Metric.KILOGRAM })
  @IsEnum(Metric)
  metric: Metric;

  @ApiProperty()
  @Matches(/^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/, {
    message: 'Date must be in parttern: "DD/MM/YYYY".',
  })
  @IsString()
  date: string;

  @ApiProperty()
  @IsString()
  @Matches(/([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Date must be in parttern: "HH:MM".',
  })
  time: string;

  @ApiProperty()
  @IsString()
  arena: string;

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  media: MediaDto[];

  @ApiProperty()
  @IsString()
  controller: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isPublic: boolean;
}

export class UserTestRequestForCoach extends OmitType(UserTestRequest, [
  'controller',
]) {
  @ApiProperty()
  @IsString()
  userId: string;
}

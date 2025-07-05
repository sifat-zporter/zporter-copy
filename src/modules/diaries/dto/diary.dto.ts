import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  EatAndDrink,
  EnergyLevel,
  MediaType,
  Sleep,
  TypeOfDiary,
} from '../enum/diaries.enum';
import { Diary, Media } from '../interfaces/diaries.interface';
import { InjuryDto } from './injury.dto';
import { MatchDto } from './match.dto';
import { TrainingDto } from './training.dto';
import * as moment from 'moment';

export class MediaDto implements Media {
  @ApiProperty()
  @IsEnum(MediaType)
  @IsIn([MediaType.IMAGE, MediaType.VIDEO])
  type: MediaType;

  @ApiProperty()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty()
  @IsString()
  url: string;

  @ApiHideProperty()
  @IsString()
  @IsOptional()
  uniqueKey?: string;
}

export class DiaryDto implements Diary {
  @ApiProperty()
  @IsEnum(EnergyLevel)
  energyLevel: EnergyLevel;

  @ApiProperty()
  @IsEnum(EatAndDrink)
  eatAndDrink: EatAndDrink;

  @ApiProperty()
  @IsEnum(EnergyLevel)
  sleep: Sleep;

  @ApiProperty()
  @IsEnum(TypeOfDiary)
  @IsIn([TypeOfDiary.TRAINING, TypeOfDiary.MATCH, TypeOfDiary.REST, TypeOfDiary.CAP])
  typeOfDiary: TypeOfDiary;

  @ApiPropertyOptional()
  @Type(() => TrainingDto)
  training?: TrainingDto;

  @ApiPropertyOptional()
  @Type(() => MatchDto)
  match?: MatchDto;

  @ApiPropertyOptional()
  @Type(() => InjuryDto)
  injury?: InjuryDto[];
}
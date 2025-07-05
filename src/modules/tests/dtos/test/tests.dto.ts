import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../../common/pagination/pagination.dto';
import { MediaDto } from '../../../diaries/dto/diary.dto';
import { LogoType } from '../../enums/logo-type';
import { Metric } from '../../enums/metric';
import { TestType } from '../../enums/test-type';
import { GeneralInfoDto } from './general-info.dto';
import { KindExerciseDto } from './kind-exercise.dto';
import { TableIndex } from './table-index.dto';
import { TimeExerciseDto } from './time-exercise.dto';
// export class TableIndex {
//   @ApiProperty()
//   @IsNotEmpty()
//   @IsNumber()
//   index: number;

//   @ApiProperty()
//   @IsNotEmpty()
//   @IsNumber()
//   colSpan: number;

//   @ApiPropertyOptional()
//   @IsOptional()
//   @IsString()
//   content: string;

//   @ApiPropertyOptional()
//   @IsOptional()
//   @IsString()
//   label: number;
// }
// export class KindExercise {
//   @ApiPropertyOptional()
//   @IsOptional()
//   @IsString()
//   numberOfPeople: string;

//   @ApiPropertyOptional()
//   @IsOptional()
//   @IsString()
//   place: string;
// }

// export class TimeExercise {
//   @ApiPropertyOptional()
//   @IsOptional()
//   @IsString()
//   time: string;

//   @ApiPropertyOptional()
//   @IsOptional()
//   @IsString()
//   period: string;
// }

// export class GeneralInfo {
//   @ApiPropertyOptional()
//   @IsOptional()
//   kindOfExercise: KindExerciseDto;

//   @ApiPropertyOptional()
//   @IsOptional()
//   @IsString()
//   timeExercise: TimeExerciseDto;

//   @ApiPropertyOptional()
//   @IsOptional()
//   @IsBoolean()
//   isPublic: boolean;
// }
export class TestsDto {
  @ApiProperty()
  @IsString()
  subtypeId: string;

  @ApiProperty()
  @IsString()
  nameOfTest: string;

  @ApiPropertyOptional({ enum: LogoType, default: LogoType.SQUAT })
  @IsOptional()
  typeOfLogo: LogoType | string;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => MediaDto)
  media: MediaDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  generalInfo: GeneralInfoDto;

  @ApiPropertyOptional()
  @IsOptional()
  description: string;

  @ApiProperty()
  @IsString()
  tableDescription: string;

  @ApiProperty()
  table: Array<TableIndex[]>;

  @ApiProperty({ type: String, example: 'Test result' })
  title: string;

  @ApiProperty({ type: String, example: '125kg' })
  placeholder: string;

  @IsOptional()
  @ApiProperty({ enum: Metric, default: Metric.KILOGRAM })
  metric: Metric;
}

// export class GetTestsByTypeDto extends PaginationDto {
//   @ApiProperty({ enum: TestType, default: TestType.PHYSICAL })
//   @IsOptional()
//   @IsEnum(TestType)
//   typeOfTest: TestType;
// }

// export class UpdateTestsDto extends PartialType(TestsDto) {}

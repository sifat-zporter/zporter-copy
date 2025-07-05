import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsDateString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

class EducationDescriptionDto {
  @IsArray()
  @IsString({ each: true })
  media: string[];

  @IsString()
  text: string;
}

export class EducationDto {
  @IsString()
  instituteSchoolName: string;

  @IsIn(['Diploma', 'Bachelor', 'Master', 'License', 'Doctor', 'Other', ''])
  typeOfDegree:
    | 'Diploma'
    | 'Bachelor'
    | 'Master'
    | 'License'
    | 'Doctor'
    | 'Other'
    | '';

  @IsString()
  fieldOfStudy: string;

  @IsString()
  result: string;

  @IsNumber()
  gradeSummary: number;

  @IsDateString()
  statingDate: string;

  @IsDateString()
  endingDate: string;

  @ValidateNested()
  @Type(() => EducationDescriptionDto)
  description: EducationDescriptionDto;

  @IsOptional()
  @IsString()
  id?: string;
}

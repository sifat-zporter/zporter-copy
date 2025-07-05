import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateZaiDto {
  @IsString()
  footballAmbition: string;

  @IsNumber()
  @Min(0)
  footballHoursPerWeek: number;

  @IsArray()
  @IsString({ each: true })
  otherSports: string[];

  @IsNumber()
  @Min(0)
  otherSportsHoursPerWeek: number;

  @IsString()
  supportArea: string;

  @IsArray()
  @IsString({ each: true })
  focusSkills: string[];

  @IsString()
  feedbackTone: string;

  @IsString()
  feedbackFrequency: string;

  @IsString()
  learningStyle: string;

  @IsBoolean()
  useMyLibraryFiles: boolean;

  @IsBoolean()
  useOtherUsersFiles: boolean;
}

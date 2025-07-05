import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';
import { MediaDto } from '../../../diaries/dto/diary.dto';
import { TypeOfPrograms } from '../../enums/type-of-programs';
import { Role } from '../../../diaries/enum/diaries.enum';

export class ExercisesRequestDto {
  @ApiProperty({ required: true })
  @IsMongoId()
  @IsOptional()
  sessionId: Types.ObjectId;

  @ApiProperty({ required: true })
  @IsString()
  @MaxLength(60)
  headline: string;

  @ApiProperty({ required: true })
  @IsString()
  description: string;

  @ApiProperty({ required: true })
  @IsString()
  @MaxLength(300)
  ingressText: string;

  @ApiProperty({ required: true, default: '2' })
  @IsNumberString()
  minParticipants: string;

  @ApiProperty()
  @IsNotEmpty()
  shareWith: string;

  @ApiProperty({ default: 1 })
  @Transform(({ value }) =>
    value.toLowerCase() === 'all' ? 1 : parseInt(value),
  )
  ageFrom: number;

  @ApiProperty({ default: 100 })
  @Transform(({ value }) =>
    value.toLowerCase() === 'all' ? 100 : parseInt(value),
  )
  ageTo: number;

  @ApiProperty()
  @IsEnum(Role)
  targetGroup: Role;

  @ApiProperty({ default: '15 min' })
  @IsString()
  @IsOptional()
  timeRun: string;

  @ApiProperty()
  @IsArray()
  tags: string[];

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  order: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MediaDto)
  @ArrayMaxSize(3)
  media: MediaDto[];

  @ApiProperty({ default: 'Field' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  location: string;

  @ApiProperty({ default: TypeOfPrograms.OTHER })
  @IsEnum(TypeOfPrograms)
  mainCategory: TypeOfPrograms;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsNotEmpty()
  collections: string[];

  @ApiProperty()
  @IsOptional()
  technics: number;
  @ApiProperty()
  @IsOptional()
  tactics: number;
  @ApiProperty()
  @IsOptional()
  physics: number;
  @ApiProperty()
  @IsOptional()
  mental: number;
  @ApiProperty()
  @IsOptional()
  physicallyStrain: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;

  @ApiProperty()
  @IsOptional()
  id?: Types.ObjectId;

  @ApiProperty()
  @IsOptional()
  _id?: Types.ObjectId;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  createdAt: Date;
}

export class UpdateExercisesRequestDto extends PartialType(
  ExercisesRequestDto,
) {}

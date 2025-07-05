import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
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
  Min,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';
import { MediaDto } from '../../../diaries/dto/diary.dto';
import { TypeOfPrograms } from '../../enums/type-of-programs';
import { Role } from '../../../diaries/enum/diaries.enum';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { ExercisesRequestDto } from '../exercise/exercises-request.dto';

export class SessionsRequestDto {
  @ApiProperty()
  @IsMongoId()
  @IsOptional()
  programId: Types.ObjectId;

  @ApiProperty()
  @IsString()
  @MaxLength(60, {
    message: ResponseMessage.Program.SESSION_HEADLINE_MAX_LENGTH,
  })
  headline: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  ingressText: string;

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  @ArrayMaxSize(3)
  @ArrayMinSize(1)
  @ArrayNotEmpty()
  media: MediaDto[];

  @ApiProperty({ default: '2' })
  @IsNumberString()
  @IsNotEmpty()
  minParticipants: string;

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
  @IsString()
  @IsOptional()
  location: string;

  @ApiProperty()
  @IsEnum(Role)
  targetGroup: Role;

  @ApiProperty()
  @IsString()
  mainCategory: TypeOfPrograms;

  @ApiProperty()
  collections: string[];

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  shareWith: string;

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
  technics: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  tactics: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  physics: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  mental: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  physicallyStrain: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  order: number;

  @ApiProperty()
  @Type(() => Number)
  @IsOptional()
  day: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;

  @ApiProperty()
  @IsMongoId()
  @IsOptional()
  id?: Types.ObjectId;

  @ApiProperty()
  @IsMongoId()
  @IsOptional()
  _id?: Types.ObjectId;

  @ApiProperty()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExercisesRequestDto)
  exercises: ExercisesRequestDto[];

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  createdAt: Date;
}

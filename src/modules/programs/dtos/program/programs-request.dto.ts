import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';
import { PaginationDto } from '../../../../common/pagination/pagination.dto';
import { MediaDto } from '../../../diaries/dto/diary.dto';
import { Role } from '../../../diaries/enum/diaries.enum';
import { TypeOfPrograms } from '../../enums/type-of-programs';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { SessionsRequestDto } from '../session/sessions-request.dto';

export class ProgramsRequestDto {
  @ApiProperty({ required: true })
  @IsString()
  @MaxLength(60, {
    message: ResponseMessage.Program.PROGRAM_HEADLINE_MAX_LENGTH,
  })
  headline: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty({ required: true, default: '2' })
  @IsNumberString()
  minParticipants: string;

  @ApiProperty()
  @IsNotEmpty()
  shareWith: string;

  @ApiProperty({ default: 1 })
  @Transform(({ value }) => (value === 'ALL' ? 1 : parseInt(value)))
  ageFrom: number;

  @ApiProperty({ default: 100 })
  @Transform(({ value }) => (value === 'ALL' ? 100 : parseInt(value)))
  ageTo: number;

  @ApiProperty()
  @IsEnum(Role)
  targetGroup: Role;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  @IsNotEmpty()
  ingressText: string;

  @ApiPropertyOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => MediaDto)
  @ArrayMaxSize(3)
  media: MediaDto[];

  @ApiProperty({ default: '15' })
  @IsNotEmpty()
  timeRun: string;

  @ApiProperty({ default: 'Field' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty()
  @IsArray()
  @IsNotEmpty({ each: true })
  tags: string[];

  @ApiProperty({ default: TypeOfPrograms.OTHER })
  @IsEnum(TypeOfPrograms)
  mainCategory: TypeOfPrograms;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsNotEmpty()
  collections: string[];

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty()
  @IsMongoId()
  id?: Types.ObjectId;

  @ApiProperty()
  @IsOptional()
  @IsMongoId()
  _id?: Types.ObjectId;

  @ApiProperty()
  @IsOptional()
  @IsMongoId()
  parentProgramId?: Types.ObjectId;

  @ApiProperty()
  @IsOptional()
  @IsMongoId()
  libProgramId?: Types.ObjectId;

  @ApiProperty()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SessionsRequestDto)
  sessions: SessionsRequestDto[];
}

export class GetProgramByQuery extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  country: string;

  @ApiPropertyOptional()
  @IsString()
  location: string;
}

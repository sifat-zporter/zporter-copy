import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { InjuryArea, PainLevel } from '../enum/diaries.enum';
import { Injury, InjuryPosition } from '../interfaces/diaries.interface';
import { MediaDto } from './diary.dto';

export class InjuryPositionDto implements InjuryPosition {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class InjuryDto implements Injury {
  @IsBoolean()
  isFront: boolean;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  treatment: string;

  @ApiProperty()
  @IsEnum(PainLevel)
  painLevel: PainLevel;

  @ApiProperty()
  @IsString({ each: true })
  @IsArray()
  injuryTags: string[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => MediaDto)
  injuryMedia: MediaDto[];

  @ApiProperty()
  @IsEnum(InjuryArea)
  injuryArea: InjuryArea;

  @ApiProperty()
  @ValidateNested()
  @Type(() => InjuryPositionDto)
  injuryPosition: InjuryPositionDto;
}

export class CreateInjuryDto implements InjuryDto {
  @IsBoolean()
  isFront: boolean;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  treatment: string;

  @ApiProperty()
  @IsEnum(PainLevel)
  painLevel: PainLevel;

  @ApiProperty()
  @IsString({ each: true })
  @IsArray()
  injuryTags: string[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => MediaDto)
  injuryMedia: MediaDto[];

  @IsEnum(InjuryArea)
  injuryArea: InjuryArea;

  @ApiProperty()
  @ValidateNested()
  @Type(() => InjuryPositionDto)
  injuryPosition: InjuryPositionDto;

  @ApiPropertyOptional({ example: '2021-09-16T00:00:00+07:00' })
  @IsString()
  @IsOptional()
  createdAt?: string;
}

export class UpdateInjuryDto extends PartialType(CreateInjuryDto) {}

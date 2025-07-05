import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { Season } from '../../enum/season.enum';
import { ICoachFootballCareer } from '../../interfaces/coaches.interface';

export class CoachCareerDto implements ICoachFootballCareer {
  @ApiProperty()
  @IsString()
  clubId: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  primaryTeamId: string;

  @ApiProperty({ default: new Date().toISOString() })
  @IsOptional()
  @IsDateString()
  contractedFrom: Date;

  @ApiProperty({ default: new Date().toISOString() })
  @IsOptional()
  @IsDateString()
  contractedUntil: Date;

  @ApiProperty({ default: new Date().toISOString() })
  @IsOptional()
  @IsDateString()
  seasonStartDate: Date;

  @ApiProperty({ default: new Date().toISOString() })
  @IsOptional()
  @IsDateString()
  seasonEndDate: Date;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamIds?: string[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedTeamIds?: string[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pendingTeamIds?: string[];

  @ApiProperty({ default: 'Head Coach' })
  @IsString()
  role: string;

  @ApiProperty({ default: 'UEFA Pro' })
  @IsString()
  highestCoachingEducation: string;

  @ApiProperty({ default: 'Semi-Pro' })
  @IsString()
  expLevel: string;

  @ApiProperty({ default: 'Vision' })
  @IsString()
  managementStyle: string;

  @ApiProperty({ default: 'Direct' })
  @IsString()
  managementType?: string;

  @ApiProperty({ default: '' })
  @IsString()
  summary: string;

  // @IsEnum(Season)
  @ApiPropertyOptional({ enum: Season, default: Season.JAN })
  @IsOptional()
  seasonStart?: Season | Season.JAN;

  // @IsEnum(Season)
  @ApiPropertyOptional({ enum: Season, default: Season.DEC })
  @IsOptional()
  seasonEnd?: Season | Season.JAN;
}

export class UpdateCoachCareerDto extends PartialType(CoachCareerDto) {}

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { JoinTeamStatus } from '../../../clubs/enum/club.enum';
import { Season } from '../../enum/season.enum';
import { IPlayerTeam } from '../../interfaces/common.interface';
import {
  IContractedClub,
  IPlayerFootballCareer,
} from '../../interfaces/players.interface';

export class PlayerTeamDto implements IPlayerTeam {
  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiProperty({ default: JoinTeamStatus })
  @IsEnum(JoinTeamStatus)
  status: JoinTeamStatus;
}

export class PlayerContractedClubDto implements IContractedClub {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  clubId: string;

  @ApiProperty({ default: new Date().toISOString() })
  @IsOptional()
  @IsDateString()
  contractedFrom: Date;

  @ApiProperty({ default: new Date().toISOString() })
  @IsOptional()
  @IsDateString()
  contractedUntil: Date;
}

export class PlayerCareerDto implements IPlayerFootballCareer {
  @ApiProperty()
  @IsOptional()
  contractedClub: IContractedClub;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  clubId: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamIds?: string[];

  @ApiProperty({ default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favoriteRoles: string[];

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  shirtNumber: number;

  @ApiProperty({ default: 'user bio summary paragraph' })
  @IsOptional()
  @IsString()
  summary: string;

  @ApiProperty({ default: [] })
  @IsOptional()
  @IsString({ each: true })
  teamCalendarLinks?: string[];

  @ApiProperty({ default: new Date().toISOString() })
  @IsOptional()
  @IsDateString()
  seasonStartDate: Date;

  @ApiProperty({ default: new Date().toISOString() })
  @IsOptional()
  @IsDateString()
  seasonEndDate: Date;

  @ApiProperty({ default: 1.2 })
  @IsOptional()
  @IsNumber()
  estMarketValue?: number;

  // @IsEnum(Season)
  @ApiPropertyOptional({ enum: Season, default: Season.JAN })
  @IsOptional()
  seasonStart?: Season | Season.JAN;

  // @IsEnum(Season)
  @ApiPropertyOptional({ enum: Season, default: Season.DEC })
  @IsOptional()
  seasonEnd?: Season | Season.JAN;
}

export class UpdatePlayerCareerDto extends PartialType(PlayerCareerDto) {}

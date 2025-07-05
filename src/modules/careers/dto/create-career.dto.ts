import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import * as moment from 'moment';
import { defaultCountry } from '../../../common/constants/country';
import { CountryDto } from '../../../common/dto/country.dto';
import { LeagueDataDto } from '../../clubs/dto/league-data.dto';
import { TeamDto } from '../../clubs/dto/team.dto';
import { MediaDto } from '../../diaries/dto/diary.dto';
import {
  IFutureCareerPlan,
  IHistoricCareerPlan,
} from '../interfaces/career.interface';

export class CreateHistoricCareerDto implements IHistoricCareerPlan {
  @ApiProperty({ example: moment.utc().format('YYYY') })
  @IsDateString()
  season: string;

  @ApiProperty({ example: moment.utc().format() })
  @IsDateString()
  fromTime: string;

  @ApiProperty({ example: moment.utc().format() })
  @IsDateString()
  toTime: string;

  @ApiProperty({ default: defaultCountry })
  @ValidateNested()
  @Type(() => CountryDto)
  country: CountryDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => LeagueDataDto)
  league: LeagueDataDto;

  @ApiProperty()
  @IsString()
  clubId: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => TeamDto)
  team: TeamDto;

  // this is just temporary, we need to split dto between player and coach later on
  @ApiProperty()
  @IsString()
  role: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  serieMatches: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  cupMatches: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  friendlyMatches: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  wonMatches: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  lostMatches: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  drawMatches: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  madeTeamGoals: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  letInTeamGoals: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  yourGoals: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  yourAssists: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  yourYellowCards: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  yourRedCards: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  yourEstPlayTime: number;

  @ApiProperty()
  @IsString()
  summary: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MediaDto)
  mediaLinks: MediaDto[];
}

export class CreateFutureCareerDto implements IFutureCareerPlan {
  @ApiProperty({ example: moment.utc().format() })
  @IsString()
  fromTime: string;

  @ApiProperty({ example: moment.utc().format() })
  @IsString()
  toTime: string;

  @ApiProperty({ default: defaultCountry })
  @ValidateNested()
  @Type(() => CountryDto)
  country: CountryDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => LeagueDataDto)
  league: LeagueDataDto;

  @ApiProperty()
  @IsString()
  clubId: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => TeamDto)
  team: TeamDto;

  // @ApiProperty()
  // @IsEnum(Role)
  // role: Role;
  // this is just temporary, we need to split dto between player and coach later on
  @ApiProperty()
  @IsString()
  role: string;

  @ApiProperty()
  @IsString()
  motivation: string;
}

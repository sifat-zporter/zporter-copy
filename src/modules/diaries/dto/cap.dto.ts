import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
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
import {
  Event,
  PhysicallyStrain,
  Place,
  PlayerPerformance,
  Role,
  TeamPerformance,
  TypeOfGame,
} from '../enum/diaries.enum';
import {
  MatchEvent,
  MatchResult,
  MatchReview,
  MatchStats,
} from '../interfaces/diaries.interface';
import { MediaDto } from './diary.dto';
import { MatchMVPDto } from './match.dto';

export class PlayerMatchReviewDto implements MatchReview {
  @IsEnum(TeamPerformance)
  teamPerformance: TeamPerformance;

  @IsString()
  teamReview: string;

  @IsEnum(PhysicallyStrain)
  physicallyStrain: PhysicallyStrain;

  @IsEnum(PlayerPerformance)
  playerPerformance: PlayerPerformance;

  @IsString()
  yourReview: string;
}

export class CoachMatchReviewDto implements MatchReview {
  @IsEnum(TeamPerformance)
  teamPerformance: TeamPerformance;

  @IsString()
  teamReview: string;
}

export class MatchStatsDto implements MatchStats {
  @IsNumber()
  @Min(0)
  @Max(120)
  minutesPlayed: number;

  @IsEnum(Role)
  role: Role;
}

export class CapWarmUpsDto {
  @IsNumber()
  tactics: number;

  @IsNumber()
  warm_up: number;

  @IsBoolean()
  starting: boolean;
}

export class MatchResultDto implements MatchResult {
  @IsNumber()
  @Min(0)
  @Max(50)
  yourTeam: number;

  @IsNumber()
  @Min(0)
  @Max(50)
  opponents: number;
}

export class CapPenaltyDto implements MatchResult {
  @IsNumber()
  @Min(0)
  @Max(50)
  yourTeam: number;

  @IsNumber()
  @Min(0)
  @Max(50)
  opponents: number;
}

export class MatchEventDto implements MatchEvent {
  @IsNumber()
  @Min(0)
  @Max(130)
  minutes: number;

  @IsEnum(Event)
  event: Event;
}

export enum TypeOfCap {
  Regional = 'REGIONAL',
  National = 'NATIONAL',
}

export class PlayerCapDto {
  @ApiProperty({ example: moment.utc().format() })
  @IsString()
  dateTime: string;

  @ApiProperty({
    default: defaultCountry,
  })
  @ValidateNested()
  @Type(() => CountryDto)
  country: CountryDto;

  @ApiProperty()
  @IsEnum(TypeOfGame)
  typeOfGame: TypeOfGame;

  @ApiProperty()
  @IsNumber()
  @Max(150)
  length: number;

  @ApiProperty()
  @IsEnum(Place)
  place: Place;

  @ApiProperty()
  @IsEnum(TypeOfCap)
  typeOfCap: TypeOfCap;

  @ApiProperty({ default: 'U15' })
  @IsString()
  yourTeam: string;

  @ApiProperty({
    default: defaultCountry,
  })
  @ValidateNested()
  @Type(() => CountryDto)
  opponentCountry: CountryDto;

  @ApiProperty()
  @IsOptional()
  @IsString()
  opponentRegion: string;

  @ApiProperty({ default: 'U15' })
  @IsString()
  opponentTeam: string;

  @ApiProperty()
  @IsString()
  arena: string;

  @ApiProperty()
  @Type(() => MatchResultDto)
  @ValidateNested()
  result: MatchResultDto;

  @ApiProperty()
  @Type(() => CapPenaltyDto)
  @ValidateNested()
  penalty_shootout: CapPenaltyDto;

  @ApiProperty()
  @Type(() => MatchStatsDto)
  @ValidateNested()
  stats: MatchStatsDto[];

  @ApiProperty()
  @Type(() => MatchEventDto)
  @ValidateNested()
  events: MatchEventDto[];

  @ApiProperty()
  @Type(() => PlayerMatchReviewDto)
  @ValidateNested()
  review: PlayerMatchReviewDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => MatchMVPDto)
  mvp?: MatchMVPDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MediaDto)
  capMedia: MediaDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => CapWarmUpsDto)
  @ValidateNested()
  warm_ups?: CapWarmUpsDto;
}

export class CoachCapDto {
  @ApiProperty({ example: moment.utc().format() })
  @IsString()
  dateTime: string;

  @ApiProperty({
    default: defaultCountry,
  })
  @ValidateNested()
  @Type(() => CountryDto)
  country: CountryDto;

  @ApiProperty()
  @IsEnum(TypeOfGame)
  typeOfGame: TypeOfGame;

  @ApiProperty()
  @IsNumber()
  @Max(150)
  length: number;

  @ApiProperty()
  @IsEnum(Place)
  place: Place;

  @ApiProperty()
  @IsEnum(TypeOfCap)
  typeOfCap: TypeOfCap;

  @ApiProperty({ default: 'U15' })
  @IsString()
  yourTeam: string;

  @ApiProperty({
    default: defaultCountry,
  })
  @ValidateNested()
  @Type(() => CountryDto)
  opponentCountry: CountryDto;

  @ApiProperty()
  @IsOptional()
  @IsString()
  opponentRegion: string;

  @ApiProperty({ default: 'U15' })
  @IsString()
  opponentTeam: string;

  @ApiProperty()
  @IsString()
  arena: string;

  @ApiProperty()
  @Type(() => MatchResultDto)
  @ValidateNested()
  result: MatchResultDto;

  @ApiProperty()
  @Type(() => CapPenaltyDto)
  @ValidateNested()
  penalty_shootout: CapPenaltyDto;

  @ApiProperty()
  @Type(() => CoachMatchReviewDto)
  @ValidateNested()
  review: CoachMatchReviewDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MediaDto)
  capMedia: MediaDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => CapWarmUpsDto)
  @ValidateNested()
  warm_ups?: CapWarmUpsDto;
}

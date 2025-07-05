import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CountryDto } from '../../../common/dto/country.dto';
import { ClubMatchDto } from '../../clubs/dto/club-match.dto';
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
  Match,
  MatchEvent,
  MatchResult,
  MatchReview,
  MatchStats,
} from '../interfaces/diaries.interface';
import { MediaDto } from './diary.dto';
import { BadRequestException } from '@nestjs/common';
import { ResponseMessage } from '../../../common/constants/common.constant';

export class PlayerReviews {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsEnum(Role)
  role: Role;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5)
  performance: number;

  @ApiProperty()
  @IsString()
  matchReview: string;
}
export class MatchReviewDto implements MatchReview {
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

export class MatchStatsDto implements MatchStats {
  @IsNumber()
  @Min(0)
  @Max(120)
  minutesPlayed: number;

  @IsEnum(Role)
  role: Role;
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

export class MatchPenaltyDto implements MatchResult {
  @IsNumber()
  @Min(0)
  @Max(50)
  yourTeam: number;

  @IsNumber()
  @Min(0)
  @Max(50)
  opponents: number;
}

export class MatchMVPDto {
  @IsString()
  yourTeam?: string;

  @IsString()
  opponents?: string;
}

export class MatchEventDto implements MatchEvent {
  @IsNumber()
  @Min(0)
  @Max(130)
  minutes: number;

  @IsEnum(Event)
  event: Event;
}

export class MatchWarmUpsDto {
  @IsNumber()
  tactics: number;

  @IsNumber()
  warm_up: number;

  @IsBoolean()
  starting: boolean;
}

export class MatchDto implements Match {
  @ApiProperty()
  // @Transform((val) => moment(val.value).format('YYYY-MM-DD'))
  @IsDateString()
  dateTime: string;

  @ApiProperty()
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

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => ClubMatchDto)
  club: ClubMatchDto;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  yourTeam: string;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => ClubMatchDto)
  opponentClub: ClubMatchDto;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  opponentTeam: string;

  @ApiProperty()
  @IsString()
  arena: string;

  @ApiProperty()
  @Type(() => MatchResultDto)
  @ValidateNested()
  result: MatchResultDto;

  @ApiProperty()
  @Type(() => MatchPenaltyDto)
  @ValidateNested()
  penalty_shootout: MatchPenaltyDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => MatchMVPDto)
  mvp?: MatchMVPDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MediaDto)
  matchMedia: MediaDto[];
}

export class PlayerMatchDto extends MatchDto {
  @ApiProperty()
  @Type(() => MatchReviewDto)
  @ValidateNested()
  review: MatchReviewDto;

  @ApiProperty()
  @Type(() => MatchStatsDto)
  @ValidateNested()
  stats: MatchStatsDto[];

  @ApiProperty()
  @Type(() => MatchEventDto)
  @ValidateNested()
  events?: MatchEventDto[];

  @ApiHideProperty()
  @IsOptional()
  totalEvents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => MatchWarmUpsDto)
  @ValidateNested()
  warm_ups?: MatchWarmUpsDto;

  public validate?(): void {
    const length = this.stats.reduce(
      (pre, curr) => (pre += curr.minutesPlayed),
      0,
    );
    if (this.length < length)
      throw new BadRequestException(ResponseMessage.Diary.STATS_OVER_TIME);
  }
}

export class CoachMatchStatsDto {
  @IsNumber()
  @Min(0)
  @Max(120)
  minute: number;

  @ApiProperty()
  @IsString()
  goalScorer: string;

  @ApiProperty()
  @IsString()
  assist: string;
}

export class CoachMatchEventsDto {
  @IsNumber()
  @Min(0)
  @Max(120)
  minute: number;

  @ApiProperty()
  @IsString()
  action: Event;

  @ApiProperty()
  @IsString()
  player: string;
}

export class CoachMatchDto extends MatchDto {
  @ApiProperty()
  @IsEnum(PhysicallyStrain)
  physicallyStrain: PhysicallyStrain;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(TeamPerformance)
  yourPerformance?: TeamPerformance;

  @ApiHideProperty()
  @IsOptional()
  teamPerformance?: TeamPerformance;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => PlayerReviews)
  playerReviews?: PlayerReviews[];

  @ApiProperty()
  @Type(() => CoachMatchStatsDto)
  @ValidateNested()
  stats: CoachMatchStatsDto[];

  @ApiProperty()
  @Type(() => CoachMatchEventsDto)
  @ValidateNested()
  events: CoachMatchEventsDto[];

  @ApiPropertyOptional()
  @IsOptional()
  teamMatchReview?: string;

  @ApiPropertyOptional()
  @IsOptional()
  opponentMatchReview?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => MatchWarmUpsDto)
  @ValidateNested()
  warm_ups?: MatchWarmUpsDto;
}

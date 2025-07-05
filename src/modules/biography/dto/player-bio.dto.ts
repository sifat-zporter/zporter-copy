import { ApiPropertyOptional } from '@nestjs/swagger';
import { BestFootTypes } from '../../../common/constants/common.constant';
import {
  CapResult,
  TotalPlayerAwardsResult,
  TotalPlayerTrophiesResult,
} from '../../achievements/interface/achievement.interface';
import { OriginalDiaryType } from '../../diaries/dto/diaries.req.dto';
import { ILastMatch } from '../../diaries/interfaces/lastMatch.interface';
import { ILastTraining } from '../../diaries/interfaces/lastTraining.interface';
import { Status } from '../../friends/enum/friend.enum';
import {
  PlayerRadarGKSkillsDto,
  PlayerRadarSkillsDto,
} from '../../users/dto/player/player-skills.dto';
import { UserVideoLinkDto } from '../../users/dto/user/user-media.dto';
import { UserSocialLinksDto } from '../../users/dto/user/user-social-links.dto';
import { UserTypes } from '../../users/enum/user-types.enum';
import { PlayerBio } from '../interfaces/player-bio.interface';
import { IStatisticalProgramDone } from '../../programs/interface/statistical-program-done.interface';
import { IStatisticalAwardTests } from '../../tests/interfaces/statistical-award-tests.interface';
import { Sponsor } from '../../sponsor/interface/sponsor.interface';

export class UserBioDto {
  @ApiPropertyOptional({
    description: `this is optional, by default, we get currentUserId from header`,
  })
  userIdQuery?: string;

  @ApiPropertyOptional()
  username?: string;
}
export class Result {
  opponents: number;
  yourTeam: number;
}
export class PlayerBioProfileDto implements PlayerBio {
  textSEO: string;
  userId: string;
  lastUpdatedDate: string;
  faceImageUrl: string;
  bodyImageUrl: string;
  firstName: string;
  lastName: string;
  username: string;
  position: string;
  currentClubIconUrl: string;
  currentClub: string;
  contractedUntil: string;
  estMarketValue: number;
  leftFoot: number;
  rightFoot: number;
  bestFoot: BestFootTypes;
  age: number;
  birthDay: string;
  country: string;
  city: string;
  countryFlagUrl: string;
  height: number;
  weight: number;
  fatherHeight: number;
  motherHeight: number;
  estimatedHeight: number;
  estimatedWeight: number;
  summary: string;
  topVideoLinks: UserVideoLinkDto[] | [];
  specialities: string[];
  starRating: number;
  circleCompleted: number;
  playerRadarSkills: PlayerRadarSkillsDto;
  playerRadarGKSkills: PlayerRadarGKSkillsDto;
  radarUpdatedByCoach: PlayerRadarSkillsDto;
  radarGKUpdatedByCoach: PlayerRadarGKSkillsDto;
  socialLinks: UserSocialLinksDto;
  isPublic: boolean;
  friendStatus?: Status;
  followStatus?: Status;
  friendCount: number;
  followCount: number;
  fanCount: number;
  isConfirmBox: boolean;
  isFollowed: boolean;
  userRole: UserTypes;
  activeSeasons: string[];
  bioUrl: string;
  teamIds: string[];
  totalTrophies?: TotalPlayerTrophiesResult;
  totalAwards?: TotalPlayerAwardsResult;
  totalCaps?: CapResult[];
  totalProgram?: IStatisticalProgramDone;
  totalTests?: IStatisticalAwardTests;
  lastTrainingType?: OriginalDiaryType;
  lastDateTraining?: number;
  lastTimeTraining?: number;
  lastOpponentClub?: string;
  lastOpponentTeam?: string;
  lastMatchResult?: Result;
  year?: number;
  clubId?: string;
  primaryTeam?: Record<string, any>;
  lastMatch: ILastMatch;
  lastTraining: ILastTraining;
  clubs: any[];
  favoriteRoles?: string[];
  summaryUpdatedByCoach?: string;
  specialityTagsUpdatedByCoach?: string[];
  sponsor: Sponsor;
}

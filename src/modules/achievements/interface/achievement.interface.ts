import { TypeOfCap } from '../../diaries/dto/cap.dto';
import { TypeOfGame } from '../../diaries/enum/diaries.enum';
import { Media } from '../../diaries/interfaces/diaries.interface';
import { ICountry } from '../../users/interfaces/users.interface';
import { AchievementType } from '../enum/achievement.enum';
import { CoachAwardType, ZPlayerAwardType } from '../enum/award-types.enum';
import { CapType } from '../enum/cap-types.enum';
import { TrophyType } from '../enum/trophy-types.enum';
import { IConnectedClub } from './connected-club.interface';

export interface ITrophy {
  achievementType: AchievementType.trophy;
  trophyType: TrophyType;
  name: string;
  country: ICountry;
  connectedClub: IConnectedClub;
  date: string;
  description: string;
  media: Media[];
}

export interface IAward {
  achievementType: AchievementType.award;
  awardType: ZPlayerAwardType | CoachAwardType;
  name: string;
  country: ICountry;
  connectedClub: IConnectedClub;
  date: string;
  description: string;
  media: Media[];
}

export interface ICap {
  capType: CapType;
  gameType: TypeOfGame;
  team: string;
  opponent: string;
  date: string;
  description: string;
  media: Media[];
}

export interface CapResult {
  type: TypeOfCap;
  teamName: string;
  count: number;
}

export interface TotalPlayerTrophiesResult {
  serieTrophyCount: number;
  cupTrophyCount: number;
  otherTrophyCount: number;
}

export interface TotalPlayerAwardsResult {
  MVP: number;
  ZOW: number;
  ZOM: number;
  ZOY: number;
  ZM: number;
  DT: number;
  GOL: number;
  GOC: number;
}

export interface TotalCoachAwardsResult {
  COM: number;
  COY: number;
}

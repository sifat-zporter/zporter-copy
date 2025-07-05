import { BestFootTypes } from '../../../common/constants/common.constant';
import { UserTypes } from '../enum/user-types.enum';
import { IUser } from './users.interface';

export interface IPlayer extends IUser {
  playerCareer?: IPlayerFootballCareer;
  type?: UserTypes;
  playerSkills?: IPlayerSkills;
}

export interface IPlayerSkills {
  specialityTags?: string[];
  overall?: IPlayerOverallSkills;
  radar?: IPlayerRadarSkills;
}

export interface IPlayerOverallSkills {
  mental?: number;
  physics?: number;
  tactics?: number;
  technics?: number;
  leftFoot?: number;
  rightFoot?: number;
}

export interface IPlayerRadarSkills {
  attacking?: number;
  defending?: number;
  dribbling?: number;
  passing?: number;
  shooting?: number;
  pace?: number;
  tackling?: number;
  heading?: number;
}

export interface IPlayerRadarGKSkills {
  vision?: number;
  communication?: number;
  ball_control?: number;
  passing?: number;
  aerial_win?: number;
  shot_dive?: number;
  agility?: number;
  reactions?: number;
}

export interface IContractedClub {
  clubId: string;
  contractedFrom?: Date;
  contractedUntil?: Date;
}

export interface IPlayerFootballCareer {
  clubId: string;
  contractedFrom?: Date;
  contractedUntil?: Date;
  bestFoot?: BestFootTypes;
  acceptedTeamIds?: string[];
  pendingTeamIds?: string[];
  favoriteRoles?: string[];
  seasonEndDate?: Date;
  seasonStartDate?: Date;
  shirtNumber?: number;
  summary?: string;
  teamCalendarLinks?: string[];
  estMarketValue?: number;
}

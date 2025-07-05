import { IClubInfo } from '../../clubs/interfaces/clubs.interface';
import { ILastMatch } from '../../diaries/interfaces/lastMatch.interface';
import { ILastTraining } from '../../diaries/interfaces/lastTraining.interface';
import { UserTypes } from '../enum/user-types.enum';
import { IUser } from './users.interface';

export interface ICoach extends IUser {
  coachCareer?: ICoachFootballCareer;
  type?: UserTypes;
  coachSkills?: ICoachSkills;
  teamIds?: string[];
  lastMatch?: ILastMatch;
  lastTraining?: ILastTraining;
}

export interface ICoachSkills {
  specialityTags?: string[];
  overall?: ICoachOverallSkills;
  radar?: ICoachRadarSkills;
}

export interface ICoachOverallSkills {
  mental?: number;
  physics?: number;
  tactics?: number;
  technics?: number;
}

export interface ICoachRadarSkills {
  attacking?: number;
  defending?: number;
  turnovers?: number;
  setPieces?: number;
  analytics?: number;
  playerDevelopment?: number;
}

export interface ICoachFootballCareer {
  clubId: string;
  contractedFrom?: Date;
  contractedUntil?: Date;
  seasonStartDate?: Date;
  seasonEndDate?: Date;
  currentTeams?: string[];
  expLevel?: string;
  highestCoachingEducation?: string;
  managementStyle?: string;
  managementType?: string;
  role?: string;
  summary?: string;
  primaryTeamId?: string;
  contractedClub?: IClubInfo;
  clubs?: any[];
}

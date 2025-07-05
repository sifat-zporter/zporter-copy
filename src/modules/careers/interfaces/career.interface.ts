import { IUserClub } from '../../clubs/interfaces/clubs.interface';
import { ILeague } from '../../clubs/interfaces/leagues.interface';
import { ITeam } from '../../clubs/interfaces/team.interface';
import { Role } from '../../diaries/enum/diaries.enum';
import { Media } from '../../diaries/interfaces/diaries.interface';
import { ICountry } from '../../users/interfaces/users.interface';

export interface ICareerPlan {
  season?: string;
  careerId?: string;
  fromTime: string;
  toTime: string;
  country: ICountry;
  league: ILeague;
  clubId: string;
  club?: IUserClub;
  team: ITeam;
  role: string;
  fromTimeUtc?: number;
  toTimeUtc?: number;
}

export interface IHistoricCareerPlan extends ICareerPlan {
  serieMatches: number;
  cupMatches: number;
  friendlyMatches: number;
  wonMatches: number;
  lostMatches: number;
  drawMatches: number;
  madeTeamGoals: number;
  letInTeamGoals: number;
  yourGoals: number;
  yourAssists: number;
  yourYellowCards: number;
  yourRedCards: number;
  yourEstPlayTime: number;
  summary: string;
  mediaLinks: Media[];
}

export interface IFutureCareerPlan extends ICareerPlan {
  motivation: string;
}

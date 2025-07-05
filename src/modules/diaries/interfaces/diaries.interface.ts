import { IMatchClub } from '../../clubs/interfaces/clubs.interface';
import { ICountry } from '../../users/interfaces/users.interface';
import { PlayerReviews } from '../dto/match.dto';
import {
  EatAndDrink,
  EnergyLevel,
  Event,
  InjuryArea,
  MediaType,
  PainLevel,
  PlayerPerformance,
  PhysicallyStrain,
  Place,
  Sleep,
  TeamPerformance,
  TypeOfDiary,
  TypeOfGame,
  TypeOfTraining,
} from '../enum/diaries.enum';

export interface Diary {
  energyLevel: EnergyLevel;
  eatAndDrink: EatAndDrink;
  sleep: Sleep;
  typeOfDiary: TypeOfDiary;
  training?: Training;
  match?: Match;
  injury?: Injury[];
}

export interface Training {
  physicallyStrain: PhysicallyStrain;
  hoursOfPractice: number;
  technics: number;
  tactics: number;
  physics: number;
  mental: number;
  practiceTags: string[];
  typeOfTraining: TypeOfTraining;
  trainingMedia: Media[];
}
export interface TrainingHistoric {
  hoursOfPractice: number;
  technics: number;
  tactics: number;
  physics: number;
  mental: number;
  practiceTags: string[];
  typeOfTraining: TypeOfTraining;
}

export interface Match {
  dateTime: string;
  country: ICountry;
  typeOfGame: TypeOfGame;
  length: number;
  place: Place;
  club: IMatchClub;
  yourTeam: string;
  opponentClub: IMatchClub;
  opponentTeam: string;
  arena: string;
  matchMedia: Media[];
  result: MatchResult;
  stats?: MatchStats[];
  events?: MatchEvent[];
  totalEvents?: Object;
  review?: MatchReview;
  playerReviews?: PlayerReviews[];
}

export interface MatchReview {
  teamPerformance: TeamPerformance;
  teamReview: string;
  physicallyStrain?: PhysicallyStrain;
  playerPerformance?: PlayerPerformance;
  yourReview?: string;
}

export interface Media {
  type: MediaType;
  url: string;
}
export interface MatchResult {
  yourTeam: number;
  opponents: number;
}
export interface MatchStats {
  minutesPlayed: number;
  role: string;
}

export interface MatchEvent {
  minutes: number;
  event: Event;
}

export interface Injury {
  isFront: boolean;
  description: string;
  treatment: string;
  painLevel: PainLevel;
  injuryArea: InjuryArea;
  injuryPosition: InjuryPosition;
  injuryTags: string[];
  injuryMedia: Media[];
}

export interface InjuryPosition {
  x: number;
  y: number;
}

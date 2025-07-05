// Dashboard Total
export interface ITrainingHours {
  team: number;
  group: number;
  personal: number;
}

export interface ISession {
  team: number;
  group: number;
  personal: number;
}

export interface IMatchesHours {
  seriesMatch: number;
  cupMatch: number;
  friendlyMatch: number;
  capMatch: number;
}

export interface ITotalHours {
  training: number;
  matches: number;
}
export interface ITrainingCategory {
  technical: number;
  tactics: number;
  mental: number;
  physical: number;
}

export interface IMatchResults {
  wins: number;
  draws: number;
  losses: number;
}

export interface IDayUsage {
  training: number;
  match: number;
  rest: number;
}

export interface ITrainingTypeDto {
  private: number;
  team: number;
  group: number;
}

export interface IMatchInTotalStatistic {
  hours: number;
  matches: number;
  points: number;
  goals: number;
  assists: number;
  yel: number;
  red: number;
}

export interface IMatchStatisticAverage {
  totalMatchType: IMatchesHours;
  averagePoint: number;
  netScore: number;
  role: string;
  averagePlayingTime: number;
  averageGoal: number;
  averageAssist: number;
  averageCard: number;
}

export interface ITrainingCategoryOfTotalHours {
  technical: number;
  tactics: number;
  mental: number;
  physical: number;
}

export interface ITrainingTypeOfTotalHours {
  group: number;
  personal: number;
  team: number;
}

export interface IDiaryRoutine {
  veryBad: number;
  bad: number;
  normal: number;
  good: number;
  veryGood: number;
}

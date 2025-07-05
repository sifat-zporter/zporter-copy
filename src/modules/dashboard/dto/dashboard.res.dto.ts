import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { UserInfoDto } from '../../../common/constants/common.constant';
import { DevelopmentProgress } from '../../development-talk/dto/development-talk.req.dto';
import {
  EatAndDrink,
  EnergyLevel,
  PainLevel,
  Sleep,
  TypeOfDiary,
} from '../../diaries/enum/diaries.enum';
import {
  IDayUsage,
  IDiaryRoutine,
  IMatchesHours,
  IMatchInTotalStatistic,
  IMatchResults,
  ISession,
  ITotalHours,
  ITrainingCategory,
  ITrainingCategoryOfTotalHours,
  ITrainingHours,
  ITrainingTypeDto,
  ITrainingTypeOfTotalHours,
} from '../interfaces/dashboard.interface';

export class OutputLeaderBoardDto {
  userInfo: UserInfoDto;
  value: number;
}

export class OutputCommon {
  personalTrainingHours: TrainingHoursDto;
  averageTrainingHours: TrainingHoursDto;
  personalMatchHours: MatchesHoursDto;
  averageMatchHours: MatchesHoursDto;
  personalTotalHours: TotalHoursDto;
  averageTotalHours: TotalHoursDto;
}

export class OutputTotalTab extends OutputCommon {
  trainingCategory: TrainingCategoryDto;
  matchResults: MatchResultsDto;
  dayUsage: DayUsageDto;
}

export class OutputTrainingTab extends OutputCommon {
  personalSessions: SessionsRequestDto;
  averageSessions: SessionsRequestDto;
  trainingType: TrainingTypeDto;
  personalTrainingCategory: TrainingCategoryDto;
  averageTrainingCategory: TrainingCategoryDto;
  personalTrainingCategoryOfTotalHours: TrainingCategoryOfTotalHoursDto;
  averageTrainingCategoryOfTotalHours: TrainingCategoryOfTotalHoursDto;
  personalTrainingTypeOfTotalHours: TrainingTypeOfTotalHoursDto;
  averageTrainingTypeOfTotalHours: TrainingTypeOfTotalHoursDto;
}

export class OutputMatchTab {
  matchStatisticAverage: MatchStatisticAverageDto;
  matchInTotalStatistic: MatchInTotalStatisticDto;
}

export class OutputTrainingBio {
  sessions: SessionsRequestDto;
  trainingHours: TrainingHoursDto;
  trainingCategory: TrainingCategoryDto;
}

export class OutputInjuriesChart {
  bodyChart: OutputInjuryDto[];
  columnChart: OutputAveragePainColumnChart;
}

export class OutputInjuryDto {
  injuryArea: string;
  value: number;
  isFront: boolean;
  total: any;
  description?: string;
  injuryTags?: string[];
}

export class OutputMatchesChart {
  personalMatchChart: CommonChartDo[];
  averageMatchChart: CommonChartDo[];
}

export class OutputDiaryRoutineChart {
  personalDiaryRoutineChart: CommonChartDo[];
  averageDiaryRoutineChart: CommonChartDo[];
  personalDiaryRoutinePieChart: DiaryRoutinePieChart;
  averageDiaryRoutinePieChart: DiaryRoutinePieChart;
}

export class OutputListDiaryRoutine {
  energyLevel: EnergyLevel;
  eatAndDrink: EatAndDrink;
  sleep: Sleep;
  painLevel: PainLevel | string;
  createdAt: number;
  diaryId: string;
  typeOfDiary?: TypeOfDiary;
}

export class OutputListDevelopmentNotes {
  playerDevelopmentProgress: DevelopmentProgress;
  coachDevelopmentProgress: DevelopmentProgress;
  createdAt: number;
  developmentTalkId: string;
}

export class OutputAveragePainColumnChart {
  injuryAreaF: number[];
  injuryAreaB: number[];
}

export class DiaryRoutinePieChart {
  veryBad: number;
  bad: number;
  normal: number;
  good: number;
  veryGood: number;
}

export class CommonChartDo {
  index: number;
  value: number;
  day: string;
}

export class TrainingCategoryDto implements ITrainingCategory {
  @IsNumber()
  technical: number;

  @IsNumber()
  tactics: number;

  @IsNumber()
  mental: number;

  @IsNumber()
  physical: number;
}

export class DayUsageDto implements IDayUsage {
  @IsNumber()
  training: number;

  @IsNumber()
  match: number;

  @IsNumber()
  rest: number;
}

export class MatchResultsDto implements IMatchResults {
  @IsNumber()
  wins: number;

  @IsNumber()
  draws: number;

  @IsNumber()
  losses: number;
}

export class DiaryRoutineDto implements IDiaryRoutine {
  @IsNumber()
  veryBad: number;

  @IsNumber()
  bad: number;

  @IsNumber()
  normal: number;

  @IsNumber()
  good: number;

  @IsNumber()
  veryGood: number;
}

export class DevelopmentProgressPercent {
  @IsNumber()
  veryBad: number;

  @IsNumber()
  bad: number;

  @IsNumber()
  normal: number;

  @IsNumber()
  good: number;

  @IsNumber()
  veryGood: number;
}

export class MatchesHoursDto implements IMatchesHours {
  @IsNumber()
  seriesMatch: number;

  @IsNumber()
  cupMatch: number;

  @IsNumber()
  friendlyMatch: number;

  @IsNumber()
  capMatch: number;
}

export class SessionsRequestDto implements ISession {
  @IsNumber()
  team: number;

  @IsNumber()
  group: number;

  @IsNumber()
  personal: number;

  @IsNumber()
  totalHistoric: number;
}

export class TotalHoursDto implements ITotalHours {
  @IsNumber()
  training: number;

  @IsNumber()
  matches: number;
}

export class TrainingCategoryOfTotalHoursDto
  implements ITrainingCategoryOfTotalHours
{
  @IsNumber()
  technical: number;

  @IsNumber()
  tactics: number;

  @IsNumber()
  mental: number;

  @IsNumber()
  physical: number;
}

export class TrainingHoursDto implements ITrainingHours {
  @IsNumber()
  team: number;

  @IsNumber()
  group: number;

  @IsNumber()
  personal: number;

  @IsNumber()
  totalHistoric: number;
}

export class TrainingTypeOfTotalHoursDto implements ITrainingTypeOfTotalHours {
  @IsNumber()
  group: number;

  @IsNumber()
  personal: number;

  @IsNumber()
  team: number;
}

export class TrainingTypeDto implements ITrainingTypeDto {
  @IsNumber()
  private: number;

  @IsNumber()
  team: number;

  @IsNumber()
  group: number;
}
export class MatchInTotalStatisticDto implements IMatchInTotalStatistic {
  @IsNumber()
  hours: number;

  @IsNumber()
  matches: number;

  @IsNumber()
  points: number;

  @IsNumber()
  goals: number;

  @IsNumber()
  assists: number;

  @IsNumber()
  yel: number;

  @IsNumber()
  red: number;

  @IsNumber()
  matchDraws: number;

  @IsNumber()
  matchWins: number;

  @IsNumber()
  matchLosses: number;
}

export class MatchStatisticAverageDto {
  @Type(() => MatchesHoursDto)
  totalMatchType: MatchesHoursDto;

  @IsNumber()
  averagePoint: number;

  @IsNumber()
  netScore: number;

  @IsString()
  role: string;

  @IsNumber()
  averagePlayingTime: number;

  @IsNumber()
  averageGoal: number;

  @IsNumber()
  averageAssist: number;

  @IsNumber()
  averageCard: number;
}

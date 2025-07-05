import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PickType,
} from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  PaginationDto,
  SortBy,
} from '../../../common/pagination/pagination.dto';
import { Role } from '../../diaries/enum/diaries.enum';
import {
  DashBoardTab,
  DiaryRoutine,
  LastDateRange,
  MatchChartType,
} from '../enum/dashboard-enum';

export enum LeaderBoardCategory {
  HOURS = 'HOURS',
  SESSION = 'SESSION',
  POINTS = 'POINTS',
  GOALS = 'GOALS',
  ASSISTS = 'ASSISTS',
  CARDS = 'CARDS',
  REVIEWS = 'REVIEWS',
  FANS = 'FANS',
  FRIENDS = 'FRIENDS',
}

export enum AgeGroup {
  ADULT = 'ADULT',

  B_2002 = 'B_2002',
  B_2003 = 'B_2003',
  B_2004 = 'B_2004',
  B_2005 = 'B_2005',
  B_2006 = 'B_2006',
  B_2007 = 'B_2007',
  B_2008 = 'B_2008',
  B_2009 = 'B_2009',
  B_2010 = 'B_2010',
  B_2011 = 'B_2011',
  B_2012 = 'B_2012',
  B_2013 = 'B_2013',

  G_2002 = 'G_2002',
  G_2003 = 'G_2003',
  G_2004 = 'G_2004',
  G_2005 = 'G_2005',
  G_2006 = 'G_2006',
  G_2007 = 'G_2007',
  G_2008 = 'G_2008',
  G_2009 = 'G_2009',
  G_2010 = 'G_2010',
  G_2011 = 'G_2011',
  G_2012 = 'G_2012',
  G_2013 = 'G_2013',
}

export enum Age {
  ADULT = 'ADULT',

  _2002 = '2002',
  _2003 = '2003',
  _2004 = '2004',
  _2005 = '2005',
  _2006 = '2006',
  _2007 = '2007',
  _2008 = '2008',
  _2009 = '2009',
  _2010 = '2010',
  _2011 = '2011',
  _2012 = '2012',
}
export class GetLeaderBoardQuery extends PaginationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clubId?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.CAM })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  //# TODO: fix check enum of AgeGroup
  @ApiPropertyOptional({ enum: AgeGroup, default: AgeGroup.B_2002 })
  @IsOptional()
  // @IsEnum(AgeGroup)
  ageGroup?: AgeGroup;

  @ApiProperty({
    enum: LeaderBoardCategory,
    default: LeaderBoardCategory.HOURS,
  })
  @IsEnum(LeaderBoardCategory)
  category: LeaderBoardCategory;

  @ApiProperty({ enum: LastDateRange, default: LastDateRange.SEVEN_DAY })
  @IsEnum(LastDateRange)
  lastDateRange: LastDateRange;
}

export class GetListDreamTeamQuery extends OmitType(GetLeaderBoardQuery, [
  'category',
  'clubId',
  'city',
  'teamId',
  'search',
  'role',
  'userIdQuery',
] as const) {}

export class BaseQueryBuilder {
  @ApiHideProperty()
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiProperty({ enum: LastDateRange })
  @IsEnum(LastDateRange)
  lastDateRange: LastDateRange;

  @ApiHideProperty()
  @IsOptional()
  seasons?: string[];
}

export class DashboardQueryBuilder extends BaseQueryBuilder {
  @ApiProperty({ enum: DashBoardTab })
  @IsEnum(DashBoardTab)
  dashboardTab: DashBoardTab;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  playerId?: string;
}

export class GetMatchChartQuery extends BaseQueryBuilder {
  @ApiProperty({ enum: MatchChartType })
  @IsEnum(MatchChartType)
  type: MatchChartType;

  @ApiPropertyOptional({
    description: 'this is optional, by default we get userId using roleId',
  })
  @IsString()
  @IsOptional()
  playerId?: string;
}

export class GetDevelopmentTalkChartDto {
  @ApiProperty({ enum: LastDateRange })
  @IsEnum(LastDateRange)
  lastDateRange: LastDateRange;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userIdQuery?: string;
}

export class GetDiaryRoutineChartQuery extends BaseQueryBuilder {
  @ApiProperty({ enum: DiaryRoutine })
  @IsEnum(DiaryRoutine)
  diaryRoutine: DiaryRoutine;

  @ApiPropertyOptional({
    description: 'this is optional, by default we get userId using roleId',
  })
  @IsString()
  @IsOptional()
  playerId?: string;
}

export class GetListDiariesReportQuery extends PaginationDto {
  @ApiProperty({ enum: DashBoardTab })
  @IsEnum(DashBoardTab)
  dashboardTab: DashBoardTab;

  @ApiPropertyOptional({
    description: 'this is optional, by default we get userId using roleId',
  })
  @IsString()
  @IsOptional()
  playerId?: string;
}

export class GetListDiariesReportDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'this is optional, by default we get userId using roleId',
  })
  @IsString()
  @IsOptional()
  playerId?: string;
}

export class ShareCapturedLeaderBoardDto {
  @ApiProperty({
    enum: LeaderBoardCategory,
    default: LeaderBoardCategory.HOURS,
  })
  @IsEnum(LeaderBoardCategory)
  category: LeaderBoardCategory;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ enum: AgeGroup, default: AgeGroup.ADULT })
  @IsOptional()
  @IsEnum(AgeGroup)
  ageGroup?: AgeGroup;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clubName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamName?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.CAM })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty()
  @IsString()
  lastDateRange: string;

  @ApiPropertyOptional({ enum: SortBy, default: SortBy.ASC })
  @IsOptional()
  @IsEnum(SortBy)
  sorted?: SortBy;

  @ApiProperty()
  @IsString()
  data: string;
}

export class ShareCapturedDreamTeamDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ enum: AgeGroup, default: AgeGroup.ADULT })
  @IsOptional()
  @IsEnum(AgeGroup)
  ageGroup?: AgeGroup;

  @ApiProperty()
  @IsString()
  lastDateRange: string;

  @ApiPropertyOptional({ enum: SortBy, default: SortBy.ASC })
  @IsOptional()
  @IsEnum(SortBy)
  sorted?: SortBy;

  @ApiProperty({ description: 'json stringify dream team data' })
  @IsString()
  data: string;
}

export class DaysArray {
  index: number;
  value: number;
  day: string;
}

export class DataChartByDateRange extends PickType(DaysArray, [
  'day',
  'value',
] as const) {}

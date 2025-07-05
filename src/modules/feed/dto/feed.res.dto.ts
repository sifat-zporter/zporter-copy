import { UserInfoDto } from '../../../common/constants/common.constant';
import { PlayerBioProfileDto } from '../../biography/dto/player-bio.dto';
import { CoachBio } from '../../biography/interfaces/coach-bio.interface';
import { TransferInfoDto } from '../../clubs/dto/club.res.dto';
import {
  AgeGroup,
  LeaderBoardCategory,
} from '../../dashboard/dto/dashboard.req.dto';
import {
  OutputInjuryDto,
  TrainingCategoryDto,
} from '../../dashboard/dto/dashboard.res.dto';
import { LastDateRange } from '../../dashboard/enum/dashboard-enum';
import {
  CoachCreateDiaryTrainingDto,
  PlayerCreateDiaryTrainingDto,
} from '../../diaries/dto/diaries.req.dto';
import { MediaDto } from '../../diaries/dto/diary.dto';
import { CoachMatchDto, PlayerMatchDto } from '../../diaries/dto/match.dto';
import { Role, TypeOfDiary } from '../../diaries/enum/diaries.enum';
import { UserTypes } from '../../users/enum/user-types.enum';
import { TypeOfPost, TypeOfProvider } from './feed.req.dto';

export class UserLikesDto {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  faceImage: string;
  createdAt: number;
  updatedAt: number;
  type?: UserTypes;
}

export class UserCommentDto extends UserLikesDto {
  commentId: string;
  content: string;
  isLiked: boolean;
}

export class MatchStatsDto {
  role: Role;
  playingTime: number;
  goals: number;
  assists: number;
  yellowCard: number;
  redCard: number;
}

export class AveragePainColumnChartDto {
  injuryAreaF: number[];
  injuryAreaB: number[];
}

export class TagsDto {
  name: string;
  uniqueKey: string;
}

export class BaseOutputListFeedDto {
  postId: string;
  typeOfPost: TypeOfPost;
  countLikes: number;
  countComments: number;
  isSaved: boolean;
  isLiked: boolean;
  userInfo?: UserInfoDto;
  providerInfo?: ProviderInfoDto;
  userId?: string;
  providerId?: string;
  mediaLinks?: MediaDto[];
  updatedAt: number;
  createdAt: number | string;
  isCommented: boolean;
  usersLiked: string[];
  usersSaved: string[];
}

export class OutputListDiariesFeedDto extends BaseOutputListFeedDto {
  training?: PlayerCreateDiaryTrainingDto | CoachCreateDiaryTrainingDto;
  match?: PlayerMatchDto | CoachMatchDto;
  injuries: OutputInjuryDto[];
  userId: string;
  typeOfDiary: TypeOfDiary;
  sleepChart: number[];
  eatChart: number[];
  energyChart: number[];
  matchStats: MatchStatsDto;
  injuryTags: string[];
  injuriesTrending: number[];
  injuryPain: string;
  averagePainColumnChart: AveragePainColumnChartDto;
  diaryId: string;
  trainingCategory: TrainingCategoryDto;
  teamPerformance?: number;
  playerPerformance?: number;
}

export interface DataRemindUpdateDiaries {
  day: number;
  type: null | string;
}

export class OutputListRemindUpdateDiariesFeed {
  content: string;
  data: DataRemindUpdateDiaries[];
}

export class ProviderInfoDto {
  name: string;
  logo: string;
  region: string;
  providerId: string;
  isFollowed?: boolean;
  typeOfProvider: TypeOfProvider;
}

export class OutputZporterNewsFeed extends BaseOutputListFeedDto {
  headline: string;
  link: string;
  excerptText: string;
}

export class OutputListNewsFeed extends BaseOutputListFeedDto {
  hrefId: string;
  headline: string;
  link: string;
  content?: string;
  excerptText: string;
  posterImageUrl: string;
  pinUntil?: string;
  tags: TagsDto;
}

export class OutputListPlainPostFeed extends BaseOutputListFeedDto {
  location: string;
  headline: string;
  text: string;
  updatedAt: number;
  friendTags: UserInfoDto[] | string[];
}

export class OutputSharedBiographiesFeed extends BaseOutputListFeedDto {
  bioInfo: PlayerBioProfileDto | CoachBio;
}

export class OutputClubTransferHistoriesFeed extends BaseOutputListFeedDto {
  transferInfo: TransferInfoDto;
}

export class OutputSharedLeaderboardFeed extends BaseOutputListFeedDto {
  teamName: string | null;
  clubName: string | null;
  country: string | null;
  category: LeaderBoardCategory;
  ageGroup: AgeGroup;
  data: string;
  role: Role;
  lastDateRange: LastDateRange;
}

export class OutputPlayerOfTheWeekFeed extends BaseOutputListFeedDto {
  sessions: number;
  goals: number;
  title: string;
  assists: number;
  ztar: number;
  hours: number;
  wins: number;
  bioInfo: PlayerBioProfileDto | CoachBio;
}

export class OutputPersonalGoalsFeed {
  headline: string;
  deadline: Date;
  userId: string;
  description: string;
  userType: string;
  category: string;
  progress: number;
}

// Output Firestore
export class BaseOutputFirestoreFeed {
  typeOfPost: TypeOfPost;
  createdAt: number;
  postId: string;
  mediaLinks: MediaDto[];
  updatedAt: number;
  userId: string;
}
export class FirestoreOutputPlainPost extends BaseOutputFirestoreFeed {
  friendTags: string[];
  headline: string;
  location: string;
  text: string;
}

export class FirestoreOutputPlayerOfTheWeek extends BaseOutputFirestoreFeed {
  assists: number;
  fanCount: number;
  followCount: number;
  friendCount: number;
  goals: number;
  hours: number;
  sessions: number;
  title: string;
  wins: number;
  ztar: number;
}

export class FlamelinkTags {
  name: string;
  uniqueKey: string;
}

export class FLMeta {
  createdBy: string;
  createdDate: EdDate;
  docId: string;
  env: string;
  fl_id: string;
  lastModifiedBy: string;
  lastModifiedDate: EdDate;
  locale: string;
  schema: string;
  schemaRef: string;
  schemaType: string;
  status: string;
}

export class EdDate {
  _seconds: number;
  _nanoseconds: number;
}
export class FirestoreOutputZporterNews extends BaseOutputFirestoreFeed {
  _fl_meta_: FLMeta;
  content: string;
  excerptText: string;
  headline: string;
  id: string;
  language: string;
  order: number;
  parentId: number;
  posterImageUrl: string;
  tags: FlamelinkTags[];
  targetGroup: string;
}

export class FirestoreOutputRssNews extends BaseOutputFirestoreFeed {
  excerptText: string;
  headline: string;
  hrefId: string;
  link: string;
  providerId: string;
}

export class FirestoreOutputPersonalGoals extends BaseOutputFirestoreFeed {
  category: string;
  media: MediaDto[];
  description: string;
  userType: UserTypes;
  deadline: Date;
  headline: string;
  progress: number;
}

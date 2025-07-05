import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BigQueryTable } from '../../../common/constants/common.constant';
import { PaginationDto } from '../../../common/pagination/pagination.dto';
import { MediaDto } from '../../diaries/dto/diary.dto';

export enum TypeOfPost {
  DIARIES = BigQueryTable.DIARIES,
  PLAIN_POSTS = BigQueryTable.PLAIN_POSTS,
  RSS_NEWS = BigQueryTable.RSS_NEWS,
  ZPORTER_NEWS = BigQueryTable.ZPORTER_NEWS,
  PLAYER_OF_THE_WEEK = BigQueryTable.PLAYER_OF_THE_WEEK,
  ZTAR_OF_THE_MATCH = BigQueryTable.ZTAR_OF_THE_MATCH,
  TRANSFERS = BigQueryTable.TRANSFERS,
  SHARED_BIOGRAPHIES = BigQueryTable.SHARED_BIOGRAPHIES,
  PERSONAL_GOALS = BigQueryTable.PERSONAL_GOALS,
  REMIND_UPDATE_DIARIES = BigQueryTable.REMIND_UPDATE_DIARIES,
  SHARED_LEADERBOARD = BigQueryTable.SHARED_LEADERBOARD,
  BIRTHDAYS = BigQueryTable.BIRTHDAYS,
  SHARED_DREAM_TEAMS = BigQueryTable.SHARED_DREAM_TEAMS,
  DREAM_TEAM_POSTS = BigQueryTable.DREAM_TEAM_POSTS,
  FANTAZY_TEAM_POSTS = BigQueryTable.FANTAZY_TEAM_POSTS,
  FANTAZY_MANAGER_OF_THE_MONTH = BigQueryTable.FANTAZY_MANAGER_OF_THE_MONTH,
  USER_TEST_POST = BigQueryTable.USER_TEST_POST,
}

export enum TypeOfProvider {
  RSS = 'rss',
  ZPORTER = 'zporter',
}

export enum Query {
  LIKE = 'like',
  UNLIKE = 'unlike',
}

export enum FeedTab {
  ALL = 'all',
  TEAM = 'team',
  FRIENDS = 'friends',
  YOURS = 'yours',
  SAVED = 'saved',
  FAMILY = 'family',
}

export class Collection {
  @IsString()
  collection: string;

  @IsString()
  doc: string;

  @IsString()
  key: string;

  @IsEnum(BigQueryTable)
  typeOfPost: BigQueryTable;
}

export class PostQueryDto {
  @ApiProperty()
  @IsString()
  postId: string;

  @ApiProperty({
    enum: TypeOfPost,
  })
  @IsEnum(TypeOfPost)
  typeOfPost: TypeOfPost;
}

export class SynchronizePostDto extends PostQueryDto {}
export class LikeQueryDto extends PostQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  commentId?: string;

  @ApiProperty()
  @IsEnum(Query)
  query: Query;
}

export class GetListNewsOfProviderQuery extends PaginationDto {
  @ApiProperty()
  @IsString()
  providerId: string;

  @ApiProperty({ type: TypeOfProvider })
  @IsEnum(TypeOfProvider)
  typeOfProvider: TypeOfProvider;
}

export class GetListFeedQuery extends PaginationDto {
  @ApiProperty()
  @IsEnum(FeedTab)
  feedTab: FeedTab;

  @ApiPropertyOptional()
  @IsOptional()
  startAfterTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  startAfterPostId?: string;
}

export class SaveNewFeedDto {
  hrefId: string;
  headline: string;
  link: string;
  excerptText: string;
  createdAt: number;
  mediaLinks: MediaDto[];
  providerId: string;
  userId?: string;
  typeOfPost: TypeOfPost;
}

export class CreatePlainPostDto {
  @ApiProperty()
  @IsString()
  headline: string;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty()
  @Type(() => MediaDto)
  @ValidateNested()
  @IsOptional()
  mediaLinks?: MediaDto[];

  @ApiProperty()
  @IsOptional()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  friendTags?: string[];

  @ApiProperty()
  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdatePlainPostDto extends PartialType(CreatePlainPostDto) {}

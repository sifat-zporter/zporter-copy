import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SortBy } from '../pagination/pagination.dto';

export enum FAQTopic {
  ABOUT_ZPORTER = "ABOUT ZPORTER",
  BIOGRAPHY = "BIOGRAPHY",
  MESSAGES_NOTIFICATIONS = "MESSAGES & NOTIFICATIONS",
  SIGN_UP_IN = "Sign_Up_In",
  DIARY = "DIARY",
  ACCOUNT_SETTINGS = "ACCOUNT_SETTINGS",
  FEED = "FEED",
  SPONSOR = "SPONSOR",
}

export class GetFAQsDto {
  @ApiProperty({ enum: FAQTopic, default: '' })
  @IsOptional()
  topic?: FAQTopic;

  @ApiPropertyOptional({ enum: SortBy, default: SortBy.ASC })
  @IsOptional()
  @IsEnum(SortBy)
  sorted?: SortBy;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  searchQuery?: string;
}

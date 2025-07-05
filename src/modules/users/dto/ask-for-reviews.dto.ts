import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import * as moment from 'moment';

export enum CategoryReview {
  SKILL_UPDATES = 'SKILL_UPDATES',
  DEVELOPMENT_TALK = 'DEVELOPMENT_TALK',
}

export class AskForReviewsDto {
  @ApiProperty({ enum: CategoryReview })
  @IsEnum(CategoryReview)
  categoryReview: CategoryReview;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiProperty()
  @IsString({ each: true })
  coachIds: string[];

  @ApiPropertyOptional({
    example: moment()
      .startOf('day')
      .subtract(1, 'day')
      .format('YYYY-MM-DDTHH:mm:ssZ'),
  })
  @IsString()
  @IsOptional()
  playerNotedAt?: string;
}

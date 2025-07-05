import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MediaDto } from '../../diaries/dto/diary.dto';
import { PersonalGoalCategory } from '../enum/personal-goal-category.enum';

export class PlayerPersonalGoalDto {
  @ApiProperty()
  @IsString()
  headline: string;

  @ApiProperty()
  @IsEnum(PersonalGoalCategory)
  category: PersonalGoalCategory;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MediaDto)
  media: MediaDto[];

  @ApiProperty({ default: new Date().toISOString() })
  @IsDateString()
  deadline: Date;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  progress: number;
}

export class CreatePlayerPersonalGoalDto extends OmitType(
  PlayerPersonalGoalDto,
  ['progress'],
) {}

export class UpdatePlayerPersonalGoalDto extends PartialType(
  PlayerPersonalGoalDto,
) {
  @ApiProperty()
  @IsString()
  docId: string;
}

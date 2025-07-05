import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import * as moment from 'moment';

export enum DevelopmentProgress {
  VERY_BAD = 'VERY_BAD',
  BAD = 'BAD',
  NORMAL = 'NORMAL',
  GOOD = 'GOOD',
  VERY_GOOD = 'VERY_GOOD',
}

export class CoachComment {
  @ApiProperty({ default: '' })
  @IsString()
  coachComment: string;
}

export class PlayerContent {
  @ApiProperty({ default: '' })
  @IsString()
  playerContent: string;

  @ApiProperty({ default: '' })
  @IsString()
  coachComment: string;
}

// Player Content Dto

export class PlayerStrength extends PlayerContent {}

export class PlayerWeaknesses extends PlayerContent {}

export class PlayerBestDevelopedSkills extends PlayerContent {}

export class PlayerSkillsNeededToDevelop extends PlayerContent {}

export class PlayerBestWayToDevelop extends PlayerContent {}

export class PlayerShortTermGoal extends PlayerContent {}

export class PlayerLongTermGoal extends PlayerContent {}

export class PlayerOtherComments extends PlayerContent {}

// Coach Comment Dto
export class CoachStrength extends CoachComment {}

export class CoachWeaknesses extends CoachComment {}

export class CoachBestDevelopedSkills extends CoachComment {}

export class CoachSkillsNeededToDevelop extends CoachComment {}

export class CoachBestWayToDevelop extends CoachComment {}

export class CoachShortTermGoal extends CoachComment {}

export class CoachLongTermGoal extends CoachComment {}

export class CoachOtherComments extends CoachComment {}

export class PlayerCreateDevelopmentNoteDto {
  @ApiProperty()
  @IsEnum(DevelopmentProgress)
  playerDevelopmentProgress: DevelopmentProgress;

  @ApiProperty()
  @ValidateNested()
  strength: PlayerStrength;

  @ApiProperty()
  @ValidateNested()
  weaknesses: PlayerWeaknesses;

  @ApiProperty()
  @ValidateNested()
  bestDevelopSkills: PlayerBestDevelopedSkills;

  @ApiProperty()
  @ValidateNested()
  skillsNeededToDevelop: PlayerSkillsNeededToDevelop;

  @ApiProperty()
  @ValidateNested()
  bestWayToDevelop: PlayerBestWayToDevelop;

  @ApiProperty()
  @ValidateNested()
  shortTermGoal: PlayerShortTermGoal;

  @ApiProperty()
  @ValidateNested()
  longTermGoal: PlayerLongTermGoal;

  @ApiProperty()
  @ValidateNested()
  otherComments: PlayerOtherComments;

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

export class CoachCommentDevelopmentNoteDto {
  @ApiPropertyOptional({
    example: moment()
      .startOf('day')
      .subtract(1, 'day')
      .format('YYYY-MM-DDTHH:mm:ssZ'),
  })
  @IsString()
  @IsOptional()
  coachNotedAt?: string;

  @ApiProperty()
  @IsEnum(DevelopmentProgress)
  coachDevelopmentProgress: DevelopmentProgress;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  playerId?: string;

  @ApiProperty()
  @ValidateNested()
  strength: CoachStrength;

  @ApiProperty()
  @ValidateNested()
  weaknesses: CoachWeaknesses;

  @ApiProperty()
  @ValidateNested()
  bestDevelopSkills: CoachBestDevelopedSkills;

  @ApiProperty()
  @ValidateNested()
  skillsNeededToDevelop: CoachSkillsNeededToDevelop;

  @ApiProperty()
  @ValidateNested()
  bestWayToDevelop: CoachBestWayToDevelop;

  @ApiProperty()
  @ValidateNested()
  shortTermGoal: CoachShortTermGoal;

  @ApiProperty()
  @ValidateNested()
  longTermGoal: CoachLongTermGoal;

  @ApiProperty()
  @ValidateNested()
  otherComments: CoachOtherComments;
}

export class PlayerUpdateDevelopmentNoteDto extends OmitType(
  PlayerCreateDevelopmentNoteDto,
  ['playerNotedAt'] as const,
) {}

export class GetDevelopmentNoteQuery {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamId?: string;

  @ApiProperty()
  @IsString()
  playerId: string;

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

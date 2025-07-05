import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import * as moment from 'moment';
import { GenderTypes } from '../../../common/constants/common.constant';
import { PaginationDto } from '../../../common/pagination/pagination.dto';
import { UserTypes } from '../../users/enum/user-types.enum';
import {
  EatAndDrink,
  EnergyLevel,
  Sleep,
  SocialLife,
  TypeOfDiary,
} from '../enum/diaries.enum';
import { CoachCapDto, PlayerCapDto } from './cap.dto';
import { DiaryDto } from './diary.dto';
import { CreateInjuryDto } from './injury.dto';
import { CoachMatchDto, PlayerMatchDto } from './match.dto';
import {
  CoachTrainingDto,
  PlayerTrainingDto,
  TrainingHistoricDto,
} from './training.dto';

export class OutputDreamTeam {
  userIds: string[];
  country: string;
  age: number;
  gender: GenderTypes;
}
export class CoachReviewDiaryDto {
  content: string;
}

export enum OriginalDiaryType {
  TEAM_TRAINING = 'TEAM_TRAINING',
  GROUP_TRAINING = 'GROUP_TRAINING',
  MATCH = 'MATCH',
}

export class ZtarOfMatch {
  diaryId: string;
  playerId: string;
  value: number;
}

export class DiaryQueryBuilder {
  @ApiPropertyOptional({
    example: moment().startOf('day').format('YYYY-MM-DD'),
  })
  @IsString()
  @IsOptional()
  createdAt?: string;
}

export class GetOriginalDiaryDto extends PickType(PaginationDto, [
  'limit',
  'startAfter',
  'sorted',
] as const) {
  @ApiPropertyOptional({
    example: moment().startOf('day').format('YYYY-MM-DD'),
  })
  @IsString()
  @IsOptional()
  createdAt?: string;

  @ApiProperty({
    enum: OriginalDiaryType,
  })
  @IsEnum(OriginalDiaryType)
  typeOfDiary: OriginalDiaryType;
}

export class GetOriginalDiaryCalendarStatusDto extends PickType(PaginationDto, [
  'sorted',
] as const) {
  @ApiPropertyOptional({
    example: moment().startOf('day').format('YYYY-MM-DD'),
    description: 'From date in format YYYY-MM-DD',
  })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    example: moment().startOf('day').format('YYYY-MM-DD'),
    description: 'To date in format YYYY-MM-DD',
  })
  @IsString()
  @IsOptional()
  to?: string;
}

export class CreateDiaryTrainingDto implements DiaryDto {
  @ApiProperty()
  @IsEnum(EnergyLevel)
  energyLevel: EnergyLevel;

  @ApiProperty()
  @IsEnum(EatAndDrink)
  eatAndDrink: EatAndDrink;

  @ApiProperty()
  @IsEnum(Sleep)
  sleep: Sleep;

  @ApiProperty()
  @IsEnum(SocialLife)
  socialLife: SocialLife;

  @ApiProperty()
  @IsEnum(TypeOfDiary)
  typeOfDiary: TypeOfDiary;

  @ApiPropertyOptional({
    example: moment()
      .startOf('day')
      .subtract(1, 'day')
      .format('YYYY-MM-DDTHH:mm:ssZ'),
  })
  @IsString()
  @IsOptional()
  createdAt?: string;

  @ApiPropertyOptional({
    example: moment()
      .startOf('day')
      .subtract(1, 'day')
      .format('YYYY-MM-DDTHH:mm:ssZ'),
  })
  @IsString()
  @IsOptional()
  updatedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originalDiaryId?: string;
}

export class PlayerCreateDiaryTrainingDto extends CreateDiaryTrainingDto {
  @ApiProperty()
  @Type(() => PlayerTrainingDto)
  @ValidateNested()
  training: PlayerTrainingDto;

  @ApiProperty()
  @Type(() => CreateInjuryDto)
  @ValidateNested()
  injuries?: CreateInjuryDto;
}

export class CreateHistoricTrainingDto {
  @ApiProperty({
    type: 'string',
    default: moment().subtract(1, 'year').format('YYYY'),
  })
  @IsOptional()
  @IsString()
  season: string;

  @ApiProperty({ type: 'number', default: 40 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  weeksTeam: number;

  @ApiProperty({ type: 'number', default: 3 })
  @IsInt()
  @IsOptional()
  avgTeam: number;

  @ApiProperty({ type: 'number', default: 40 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  weeksPersonal: number;

  @ApiProperty({ type: 'number', default: 3 })
  @IsOptional()
  @IsInt()
  avgPersonal: number;

  @ApiProperty()
  @Type(() => TrainingHistoricDto)
  @ValidateNested()
  training: TrainingHistoricDto;

  @ApiPropertyOptional({
    example: moment()
      .startOf('day')
      .subtract(1, 'day')
      .format('YYYY-MM-DDTHH:mm:ssZ'),
  })
  @IsString()
  @IsOptional()
  createdAt?: string;
}

export class CoachCreateDiaryTrainingDto extends OmitType(
  CreateDiaryTrainingDto,
  ['energyLevel', 'eatAndDrink', 'sleep'] as const,
) {
  @ApiProperty()
  @Type(() => CoachTrainingDto)
  @ValidateNested()
  @IsNotEmptyObject()
  training: CoachTrainingDto;

  @ApiProperty()
  @IsString()
  teamId: string;
}

export class CreateDiaryMatchDto implements DiaryDto {
  @ApiProperty()
  @IsEnum(EnergyLevel)
  energyLevel: EnergyLevel;

  @ApiProperty()
  @IsEnum(EatAndDrink)
  eatAndDrink: EatAndDrink;

  @ApiProperty()
  @IsEnum(Sleep)
  sleep: Sleep;

  @ApiProperty({ default: TypeOfDiary.MATCH })
  @IsEnum(TypeOfDiary)
  typeOfDiary: TypeOfDiary;

  @ApiPropertyOptional({
    example: moment()
      .startOf('day')
      .subtract(1, 'day')
      .format('YYYY-MM-DDTHH:mm:ssZ'),
  })
  @IsString()
  @IsOptional()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originalDiaryId?: string;
}

export class PlayerCreateDiaryMatchDto extends CreateDiaryMatchDto {
  @ApiProperty()
  @Type(() => PlayerMatchDto)
  @ValidateNested()
  match: PlayerMatchDto;

  @ApiProperty()
  @Type(() => CreateInjuryDto)
  @ValidateNested()
  injuries?: CreateInjuryDto;
}

export class CoachCreateDiaryMatchDto extends OmitType(CreateDiaryMatchDto, [
  'eatAndDrink',
  'sleep',
  'energyLevel',
] as const) {
  @ApiProperty()
  @Type(() => CoachMatchDto)
  @ValidateNested()
  match: CoachMatchDto;

  @ApiProperty()
  @IsString()
  teamId: string;
}

export class CreatePlayerDiaryCapDto implements DiaryDto {
  @ApiProperty()
  @IsEnum(EnergyLevel)
  energyLevel: EnergyLevel;

  @ApiProperty()
  @IsEnum(EatAndDrink)
  eatAndDrink: EatAndDrink;

  @ApiProperty()
  @IsEnum(Sleep)
  sleep: Sleep;

  @ApiProperty({ default: TypeOfDiary.CAP })
  @IsEnum(TypeOfDiary)
  typeOfDiary: TypeOfDiary;

  @ApiProperty()
  @Type(() => PlayerCapDto)
  @ValidateNested()
  cap: PlayerCapDto;

  @ApiProperty({ default: UserTypes.PLAYER })
  @IsString()
  userType: UserTypes.PLAYER;

  @ApiProperty()
  @Type(() => CreateInjuryDto)
  @ValidateNested()
  injuries?: CreateInjuryDto;

  @ApiPropertyOptional({ example: '2021-09-16T00:00:00+07:00' })
  @IsString()
  @IsOptional()
  createdAt?: string;
}

export class CreateCoachDiaryCapDto implements DiaryDto {
  @ApiProperty()
  @IsEnum(EnergyLevel)
  energyLevel: EnergyLevel;

  @ApiProperty()
  @IsEnum(EatAndDrink)
  eatAndDrink: EatAndDrink;

  @ApiProperty()
  @IsEnum(Sleep)
  sleep: Sleep;

  @ApiProperty({ default: TypeOfDiary.CAP })
  @IsEnum(TypeOfDiary)
  typeOfDiary: TypeOfDiary;

  @ApiProperty({ default: UserTypes.COACH })
  @IsString()
  userType: UserTypes.COACH;

  @ApiProperty()
  @Type(() => CoachCapDto)
  @ValidateNested()
  cap: CoachCapDto;

  @ApiPropertyOptional({ example: '2021-09-16T00:00:00+07:00' })
  @IsString()
  @IsOptional()
  createdAt?: string;
}

export class UpdateDiaryQueryDto {
  @IsString()
  diaryId: string;

  @IsOptional()
  injuryId?: string;
}

export class UpdateCoachDiaryQueryDto {
  @IsString()
  diaryId: string;
}

export class PlayerUpdateDiaryTrainingDto extends PartialType(
  PlayerCreateDiaryTrainingDto,
) {
  // empty
}

export class CoachUpdateDiaryTrainingDto extends PartialType(
  CoachCreateDiaryTrainingDto,
) {
  // empty
}

export class UpdatePlayerDiaryCapDto extends PartialType(
  OmitType(CreatePlayerDiaryCapDto, ['typeOfDiary'] as const),
) {
  // empty
}

// This return a injury so i have commented
export class UpdateCoachDiaryCapDto extends PartialType(
  OmitType(CreateCoachDiaryCapDto, ['typeOfDiary'] as const),
) {
  // empty
}

export class PlayerUpdateDiaryMatchDto extends PartialType(
  PlayerCreateDiaryMatchDto,
) {
  // empty
}

export class CoachUpdateDiaryMatchDto extends PartialType(
  CoachCreateDiaryMatchDto,
) {
  // empty
}

export class UpdateHistoricTrainingDto extends PartialType(
  CreateHistoricTrainingDto,
) {
  // empty
}

export class DeleteDiaryQueryDto {
  @IsString()
  diaryId: string;

  @IsString()
  injuryId: string;
}

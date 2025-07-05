import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsString,
  ValidateNested,
} from 'class-validator';
import * as moment from 'moment';
import { defaultCountry } from '../../../common/constants/country';
import { CountryDto } from '../../../common/dto/country.dto';
import { MediaDto } from '../../diaries/dto/diary.dto';
import { AchievementType } from '../enum/achievement.enum';
import { CoachAwardType, ZPlayerAwardType } from '../enum/award-types.enum';
import { ConnectedClubType } from '../enum/connected-club.enum';
import { TrophyType } from '../enum/trophy-types.enum';
import { IAward, ITrophy } from '../interface/achievement.interface';
import { IConnectedClub } from '../interface/connected-club.interface';

export class ConnectedClubDto implements IConnectedClub {
  connectedClubType: ConnectedClubType;
  careerId?: string;
  clubId: string;
}

export class CreateTrophyDto implements ITrophy {
  @ApiProperty({ default: AchievementType.trophy })
  @IsString()
  achievementType: AchievementType.trophy;

  @ApiProperty()
  @IsEnum(TrophyType)
  trophyType: TrophyType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ default: defaultCountry })
  @ValidateNested()
  @Type(() => CountryDto)
  country: CountryDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ConnectedClubDto)
  connectedClub: ConnectedClubDto;

  @ApiProperty({ example: moment.utc().format() })
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MediaDto)
  media: MediaDto[];
}

export class PlayerCreateAwardDto implements IAward {
  @ApiProperty({ default: AchievementType.award })
  @IsString()
  achievementType: AchievementType.award;

  @ApiProperty()
  @IsEnum(ZPlayerAwardType)
  awardType: ZPlayerAwardType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ default: defaultCountry })
  @ValidateNested()
  @Type(() => CountryDto)
  country: CountryDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ConnectedClubDto)
  connectedClub: ConnectedClubDto;

  @ApiProperty({ example: moment.utc().format() })
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MediaDto)
  media: MediaDto[];
}

export class CoachCreateAwardDto implements IAward {
  @ApiProperty({ default: AchievementType.award })
  @IsString()
  achievementType: AchievementType.award;

  @ApiProperty()
  @IsEnum(CoachAwardType)
  awardType: CoachAwardType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ default: defaultCountry })
  @ValidateNested()
  @Type(() => CountryDto)
  country: CountryDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ConnectedClubDto)
  connectedClub: ConnectedClubDto;

  @ApiProperty({ example: moment.utc().format() })
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MediaDto)
  media: MediaDto[];
}

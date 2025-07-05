import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsOptional, ValidateNested } from 'class-validator';
import { UserTypes } from '../enum/user-types.enum';
import { CreateCoachDto } from './coach.dto';
import { CreatePlayerDto } from './player.dto';
import { CreateSupporterDto } from './supporter.dto';
import { UpdateUserHealthDto, UserHealthDto } from './user/user-health.dto';
import { UpdateUserMediaDto, UserMediaDto } from './user/user-media.dto';
import { UpdateUserProfileDto, UserProfileDto } from './user/user-profile.dto';
import {
  UpdateUserSettingsDto,
  UserSettingsDto,
} from './user/user-settings.dto';
import {
  UpdateUserSocialLinksDto,
  UserSocialLinksDto,
} from './user/user-social-links.dto';

export class UserDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => UserHealthDto)
  health?: UserHealthDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => UserMediaDto)
  media?: UserMediaDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile?: UserProfileDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => UserSettingsDto)
  settings?: UserSettingsDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => UserSocialLinksDto)
  socialLinks?: UserSocialLinksDto;

  @ApiHideProperty()
  @IsOptional()
  username?: string;

  @ApiHideProperty()
  @IsOptional()
  type?: UserTypes;

  @ApiHideProperty()
  @IsOptional()
  userId?: string;

  @ApiHideProperty()
  @IsOptional()
  isOnline?: boolean;
}

export class UpdateUserDto {
  @ApiProperty({ default: 'your@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserHealthDto)
  health?: UpdateUserHealthDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserMediaDto)
  media?: UpdateUserMediaDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserProfileDto)
  profile?: UpdateUserProfileDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserSettingsDto)
  settings?: UpdateUserSettingsDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserSocialLinksDto)
  socialLinks?: UpdateUserSocialLinksDto;
}

export class UpdateAccountEmailDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export interface GeneralUserDto extends CreatePlayerDto, CreateCoachDto, CreateSupporterDto {
  deletedAt?: number;
}

import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { defaultCountry } from '../../../../common/constants/country';
import { CountryDto } from '../../../../common/dto/country.dto';
import { INotificationOptions } from '../../interfaces/notification.interface';
import { IUserSettings } from '../../interfaces/users.interface';

export class NotificationOptionsDto implements INotificationOptions {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  profileAndDiaryUpdates: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  feedUpdates: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  messageUpdates: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  inviteUpdates: boolean;
}

export class UserSettingsDto implements IUserSettings {
  @ApiPropertyOptional({
    default: defaultCountry,
  })
  @ValidateNested()
  @Type(() => CountryDto)
  country: CountryDto;

  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  language: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  public: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notificationOn: boolean;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => NotificationOptionsDto)
  notificationOptions: NotificationOptionsDto;
}

export class UpdateUserSettingsDto extends PartialType(UserSettingsDto) {}

import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { GenderTypes } from '../../../../common/constants/common.constant';
import { defaultCountry } from '../../../../common/constants/country';
import { CountryDto } from '../../../../common/dto/country.dto';
import { IUserProfile } from '../../interfaces/users.interface';

export class UserProfileDto implements IUserProfile {
  @ApiProperty({ default: '' })
  @IsString()
  phone: string;

  @ApiProperty({ default: '' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ default: '' })
  @IsString()
  lastName: string;

  @ApiHideProperty()
  fullName?: string[];

  @ApiProperty({ default: '' })
  @IsOptional()
  @IsEmail()
  parentEmail?: string;

  @ApiProperty({ default: GenderTypes.Male })
  @IsEnum(GenderTypes)
  gender: GenderTypes;

  @ApiPropertyOptional({
    default: defaultCountry,
  })
  @ValidateNested()
  @Type(() => CountryDto)
  birthCountry: CountryDto;

  @ApiProperty({ default: new Date().toISOString() })
  @IsDateString()
  birthDay: string;

  @ApiProperty({ default: '' })
  @IsString()
  homeAddress: string;

  @ApiProperty({ default: '' })
  @IsString()
  postNumber: string;

  @ApiProperty({ default: '' })
  @IsString()
  region: string;

  @ApiProperty({ default: '' })
  @IsString()
  city: string;
}

export class UpdateUserProfileDto extends PartialType(UserProfileDto) {}

import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { listNameCountry } from '../../../common/constants/country';
import { IClubInfo } from '../interfaces/clubs.interface';

export class CreateClubDto implements IClubInfo {
  @ApiHideProperty()
  @IsOptional()
  @IsString()
  clubId?: string;

  @ApiProperty()
  @IsString()
  clubName: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  nickName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty()
  @IsString()
  @IsIn(listNameCountry)
  country: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  arena?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  websiteUrl?: string;
}

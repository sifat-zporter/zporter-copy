import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IUserSocialLinks } from '../../interfaces/users.interface';

export class UserSocialLinksDto implements IUserSocialLinks {
  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  twitter?: string;

  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  youtube?: string;

  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  veoHighlites?: string;

  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  tiktok?: string;
}

export class UpdateUserSocialLinksDto extends PartialType(UserSocialLinksDto) {}

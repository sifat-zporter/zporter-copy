import {
  ApiPreconditionFailedResponse,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class TeamsRequestDto {
  @ApiProperty()
  @IsString()
  teamName: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isPrivate: boolean;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  clubId?: string;

  @ApiProperty()
  @IsString()
  ip?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  teamImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ each: true })
  memberIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  isDeleted: boolean | false;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ClubMatchDto {
  @ApiPropertyOptional()
  @IsString()
  clubId: string;

  @ApiPropertyOptional()
  @IsString()
  clubName: string;

  @ApiPropertyOptional()
  @IsString()
  logoUrl: string;

  @ApiPropertyOptional()
  @IsString()
  country: string;
}

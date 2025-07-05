import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class ClubUserDto {
  @ApiPropertyOptional()
  @IsString()
  clubId: string;

  @ApiPropertyOptional()
  @IsDateString()
  contractedUntil: Date;
}

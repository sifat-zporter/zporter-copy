import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/pagination/pagination.dto';
import { BioStatsTab } from '../enum/bio-player-stats.enum';
import * as moment from 'moment';

export class CoachBioStatsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: `this is optional, by default, we get userId from token`,
  })
  userIdQuery?: string;

  @ApiPropertyOptional()
  username?: string;

  @ApiProperty()
  @IsEnum(BioStatsTab)
  statsTab: BioStatsTab;

  @ApiPropertyOptional({
    description: `only pass this field when you query for past season`,
  })
  @IsString()
  @IsOptional()
  season?: string;

  @ApiPropertyOptional({
    example: moment().format('YYYY-MM-DDTHH:mm:ssZ'),
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    example: moment().format('YYYY-MM-DDTHH:mm:ssZ'),
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}

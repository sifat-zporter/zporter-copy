import { OmitType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PlayerBioStatsDto } from './player-bio-stats.dto';

export class Head2HeadDto extends OmitType(PlayerBioStatsDto, [
  'userIdQuery',
] as const) {
  @ApiProperty({
    description: `choose who to compare with`,
  })
  @IsString()
  userIdQuery: string;

  @ApiPropertyOptional()
  username?: string;
}

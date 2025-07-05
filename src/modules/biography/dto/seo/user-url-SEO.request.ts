import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class UserUrlSEOResquest {
  @ApiPropertyOptional()
  @Type(() => Number)
  limit: number;
}

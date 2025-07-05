import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class UserPresenceQuery {
  @ApiProperty({ default: true })
  @IsBoolean()
  @Type(() => Boolean)
  status: boolean;
}

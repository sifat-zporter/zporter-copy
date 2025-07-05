import { ApiProperty } from '@nestjs/swagger';
import { IsIP } from 'class-validator';

export class DetectLocationDto {
  @ApiProperty()
  @IsIP()
  ip: string;
}

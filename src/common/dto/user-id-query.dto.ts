import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UserIdQueryDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  userIdQuery?: string;
}

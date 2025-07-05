import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ClaimAdminDto {
  @ApiProperty()
  @IsString()
  @IsEmail()
  email: string;
}

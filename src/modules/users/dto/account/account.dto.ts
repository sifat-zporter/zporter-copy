import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class AccountDto {
  @ApiPropertyOptional({ default: 'your@email.com' })
  @IsEmail()
  email?: string;
}

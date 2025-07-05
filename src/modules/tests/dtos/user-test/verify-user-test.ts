import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class VerifyUserTest {
  @ApiProperty()
  @IsString()
  userTestId: string;

  @ApiProperty()
  @IsBoolean()
  isVerified: boolean;
}

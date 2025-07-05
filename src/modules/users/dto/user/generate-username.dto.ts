import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsString, MinLength } from 'class-validator';
import { UserTypes } from '../../enum/user-types.enum';

export class GenerateUsernameDto {
  @ApiProperty({ default: '' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ default: '' })
  @IsString()
  lastName: string;

  @ApiProperty({ default: '' })
  @IsEnum(UserTypes)
  userType: UserTypes;

  @ApiProperty({ default: new Date().toISOString() })
  @IsDateString()
  birthDay: string;
}

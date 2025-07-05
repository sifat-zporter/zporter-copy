import { IsEnum, IsString } from 'class-validator';
import { UserTypes } from './../enum/user-types.enum';
import { ApiProperty } from '@nestjs/swagger';

export class GetUserProfileDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ default: UserTypes.PLAYER })
  @IsEnum(UserTypes)
  userType: UserTypes;
}

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserTypes } from '../../users/enum/user-types.enum';

export class CountUserAchievementsDto {
  @IsString()
  userId: string;

  @IsEnum(UserTypes)
  userType?: UserTypes;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}

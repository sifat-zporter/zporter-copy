import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/pagination/pagination.dto';
import { AchievementType } from '../enum/achievement.enum';

export class GetAchievementDto extends PaginationDto {
  @ApiProperty({
    description: `this is optional, by default, we get userId from token`,
  })
  @IsOptional()
  @IsString()
  userIdQuery?: string;

  @ApiProperty({
    description: `this is optional, by default, we get all achievements regardless of type`,
  })
  @IsOptional()
  @IsEnum(AchievementType)
  type?: AchievementType;
}

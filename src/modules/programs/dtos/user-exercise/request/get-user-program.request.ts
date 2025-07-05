import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import { SortBy } from '../../../../../common/pagination/pagination.dto';
import { AgeGroup } from '../../../../dashboard/dto/dashboard.req.dto';
import { Role } from '../../../../diaries/enum/diaries.enum';
import { UserProgramTab } from '../../../enums/user-program-tab';
import { ProgramsFieldSort } from '../../../enums/sort-program';

export class GetUserProgramRequest {
  @ApiProperty({ default: 10 })
  @Type(() => Number)
  @Max(99, { message: 'limit must be less than 99 !' })
  @Min(1, { message: 'limit must be more than 0 !' })
  limit: number;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @Min(1, { message: 'startAfter must be more than 0 !' })
  startAfter: number;

  @ApiPropertyOptional({
    enum: ProgramsFieldSort,
    default: ProgramsFieldSort.CREATED_DESC,
  })
  @IsOptional()
  @IsEnum(ProgramsFieldSort)
  programSort?: ProgramsFieldSort;

  @ApiProperty({ enum: SortBy, default: SortBy.ASC })
  @IsEnum(SortBy)
  sorted: SortBy;

  @ApiProperty({ enum: UserProgramTab, default: UserProgramTab.NEW })
  // @IsString()
  // @IsEnum(UserProgramTab)
  tab: UserProgramTab;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ enum: AgeGroup, default: AgeGroup.B_2002 })
  @IsOptional()
  // @IsEnum(AgeGroup)
  ageGroup?: AgeGroup;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clubId?: string;

  @ApiPropertyOptional({ enum: Role, default: '' })
  @IsOptional()
  role?: Role;
}

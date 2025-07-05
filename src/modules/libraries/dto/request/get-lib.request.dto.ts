import { LibRequestDto } from './lib.request.dto';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { SortBy } from '../../../../common/pagination/pagination.dto';
import { GetUserProgramRequest } from '../../../programs/dtos/user-exercise/request/get-user-program.request';
import { AgeGroup } from '../../../dashboard/dto/dashboard.req.dto';
import { Role } from '../../../diaries/enum/diaries.enum';
import { ProgramsFieldSort } from '../../../programs/enums/sort-program';
import { LibraryFieldSort } from '../../enum/sort-library';

export class GetLibRequestDto implements Partial<LibRequestDto> {
  @ApiProperty({ default: 10 })
  @Type(() => Number)
  @Min(1, { message: 'The number of page size must be greater than 0' })
  limit: number;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @Min(1, { message: 'The page must be greater than 0' })
  startAfter: number;

  @ApiPropertyOptional({
    enum: LibraryFieldSort,
    default: LibraryFieldSort.CREATED_DESC,
  })
  @IsOptional()
  @IsEnum(LibraryFieldSort)
  programSort?: LibraryFieldSort;

  @ApiPropertyOptional({ enum: SortBy, default: SortBy.ASC })
  @IsOptional()
  @IsEnum(SortBy)
  sorted?: SortBy;

  //# this line for FrontEnd's function(don't care about this)
  date?: any;

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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  isAdmin?: boolean;
  headline?: string;
}

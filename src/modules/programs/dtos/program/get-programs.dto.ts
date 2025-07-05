import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { SortBy } from '../../../../common/pagination/pagination.dto';
import { TypeOfPrograms } from '../../enums/type-of-programs';
import { Program } from '../../repositories/program/program';

export class GetProgramsDto {
  @ApiProperty({ enum: TypeOfPrograms, default: TypeOfPrograms.PHYSICAL })
  @IsEnum(TypeOfPrograms)
  @IsOptional()
  mainCategory?: TypeOfPrograms;

  @ApiProperty({ default: 10 })
  @Type(() => Number)
  @Min(1, { message: 'The number of page size must be greater than 0' })
  limit: number;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @Min(1, { message: 'The page must be greater than 0' })
  startAfter: number;

  @ApiPropertyOptional({ enum: SortBy, default: SortBy.ASC })
  @IsOptional()
  @IsEnum(SortBy)
  sorted?: SortBy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userIdQuery?: string;
}

export interface ResultGetPrograms {
  data: Program[];
  totalPage: number;
  currentPage: number;
}

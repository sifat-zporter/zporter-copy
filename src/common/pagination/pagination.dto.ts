import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum SortBy {
  ASC = 'asc',
  DESC = 'desc',
}

export class PaginationDto {
  @ApiProperty({ default: 10 })
  limit: number;

  @ApiPropertyOptional()
  @IsOptional()
  startAfter?: number;

  @ApiPropertyOptional({ enum: SortBy, default: SortBy.ASC })
  @IsOptional()
  @IsEnum(SortBy)
  sorted?: SortBy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userIdQuery?: string;
}

export enum DefaultPagination {
  PAGE = 1,
  PAGE_SIZE = 10,
}

export class PaginationOrmDto {
  @ApiProperty({ default: DefaultPagination.PAGE })
  @IsNotEmpty()
  @IsNumberString({})
  page: string;

  @ApiProperty({ default: DefaultPagination.PAGE_SIZE })
  @IsNotEmpty()
  @IsNumberString()
  pageSize: string;
}

export class ResponsePagination<T> {
  data: T[];
  currentPage: number;
  nextPage: number;
  pageSize: number;
  totalPage: number;
  count: number;
}

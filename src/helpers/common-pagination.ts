import { HttpException, HttpStatus } from '@nestjs/common';
import {
  PaginationDto,
  ResponsePagination,
} from '../common/pagination/pagination.dto';

export function commonPagination<T>(
  paginationDto: PaginationDto,
  data: any,
  count?: number,
): ResponsePagination<T> {
  const { limit, startAfter } = paginationDto;

  const commonRadix = 10;
  const page = parseInt(`${startAfter}`, commonRadix) - 1 || 0;
  const pageSize = parseInt(`${limit}`, commonRadix) || 1;

  if (page < 0 || pageSize < 1) {
    throw new HttpException(
      'The number of page size must be greater than 0',
      HttpStatus.BAD_REQUEST,
    );
  }

  return {
    data,
    count,
    currentPage: page + 1,
    nextPage: page + 2,
    pageSize,
    totalPage: Math.ceil(count / pageSize) || 0,
  };
}

import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

@Injectable()
export class CommonResponse<T> {
  constructor(
    public message: string,
    public statusCode: HttpStatus,
    public body: T,
  ) {}
}

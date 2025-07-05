import { HttpStatus, Inject } from '@nestjs/common';
import { CommonResponse } from './dto/common-response';

export class AbstractController<s> {
  constructor(
    @Inject()
    protected readonly service: s,
  ) {}

  response<U, T extends { message: string; statusCode: HttpStatus; body: U }>(
    responseInput: T,
  ): CommonResponse<U> {
    return new CommonResponse(
      responseInput.message,
      responseInput.statusCode,
      responseInput.body,
    );
  }
}

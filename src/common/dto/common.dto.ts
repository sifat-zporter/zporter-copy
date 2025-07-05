import { ApiProperty } from '@nestjs/swagger';
import { IResponseCommon } from '../interfaces/common.interface';

export class BaseResponseDto<T> implements IResponseCommon {
  @ApiProperty()
  message: string;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  body: T;
}

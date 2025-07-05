import { IsNumber, IsObject, IsString } from 'class-validator';

export class BaseResponseDto<T> {
  @IsNumber()
  statusCode: number;

  @IsString()
  message: string;

  @IsObject()
  data: T;
}

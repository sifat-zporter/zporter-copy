import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateOrderRequestDto {
  @ApiProperty()
  @IsString()
  secretKey: string;
}

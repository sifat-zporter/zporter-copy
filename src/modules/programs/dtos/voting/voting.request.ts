import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class VotingRequest {
  @ApiProperty()
  @IsNumber()
  star: number;
}

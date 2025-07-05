import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class ExecutionRequestDto {
  @ApiProperty()
  @IsString()
  exerciseId: string;
}

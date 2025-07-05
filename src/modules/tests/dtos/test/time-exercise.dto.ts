import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TimeExerciseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  time: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class KindExerciseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numberOfPeople: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  place: string;
}

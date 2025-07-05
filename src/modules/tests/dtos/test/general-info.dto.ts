import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { KindExerciseDto } from './kind-exercise.dto';
import { TimeExerciseDto } from './time-exercise.dto';

export class GeneralInfoDto {
  @ApiPropertyOptional()
  @IsOptional()
  kindOfExercise: KindExerciseDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeExercise: TimeExerciseDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic: boolean;
}

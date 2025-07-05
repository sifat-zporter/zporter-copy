import { ApiProperty } from '@nestjs/swagger';
import { ProgramsRequestDto } from './program/programs-request.dto';
import { ValidateNested, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class ProgramTotalRequestDto {
  @ApiProperty()
  @ValidateIf((dto) => dto?.program?.isPublic)
  @ValidateNested()
  @Type(() => ProgramsRequestDto)
  program: ProgramsRequestDto;
}

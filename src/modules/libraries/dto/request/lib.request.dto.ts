import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

export class LibRequestDto {
  @ApiProperty()
  @IsString()
  headline: string;

  @ApiProperty({ default: 1 })
  @Transform(({ value }) => (value.toLowerCase() == 'all' ? 1 : parseInt(value)))
  ageFrom: number;

  @ApiProperty({ default: 100 })
  @Transform(({ value }) => (value.toLowerCase() == 'all' ? 100 : parseInt(value)))
  ageTo: number;

  [key: string]: any;
}

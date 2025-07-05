import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role } from '../../../diaries/enum/diaries.enum';

export class RequiredRequestDto {
  @ApiProperty({ required: true })
  @IsString()
  @MaxLength(40)
  @IsNotEmpty()
  headline: string;

  @ApiProperty({ required: true })
  @IsString()
  description: string;

  @ApiProperty({ required: true, default: '2' })
  @IsNumberString()
  minParticipants: string;

  @ApiProperty()
  @IsNotEmpty()
  shareWith: string;

  @ApiProperty({ default: '0' })
  @IsNotEmpty()
  ageFrom: number;

  @ApiProperty({ default: '100' })
  @IsNotEmpty()
  ageTo: number;

  @ApiProperty()
  @IsEnum(Role)
  targetGroup: Role;
}

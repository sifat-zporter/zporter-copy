import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import {
  IHeight,
  IUserHealth,
  IWeight,
} from '../../interfaces/users.interface';

export class HeightDto {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  value: number;

  @ApiProperty({ default: new Date().toISOString() })
  @IsOptional()
  @IsDateString()
  updatedAt: string;
}

export class WeightDto {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  value: number;

  @ApiProperty({ default: new Date().toISOString() })
  @IsOptional()
  @IsDateString()
  updatedAt: string;
}

export class UserHealthDto {
  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => HeightDto)
  height: HeightDto;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => WeightDto)
  weight: WeightDto;

  @ApiPropertyOptional({ default: 175 })
  @IsOptional()
  @IsNumber()
  fatherHeight: number;

  @ApiPropertyOptional({ default: 160 })
  @IsOptional()
  @IsNumber()
  motherHeight: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  leftFootLength: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  rightFootLength: number;
}

export class UpdateUserHealthDto extends PartialType(UserHealthDto) {}

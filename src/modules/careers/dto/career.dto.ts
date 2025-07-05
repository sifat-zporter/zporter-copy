import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export enum CareerTypes {
  Historic = 'HISTORIC',
  Future = 'FUTURE',
}

export class GetCareersDto extends PaginationDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  userIdQuery?: string;

  @ApiPropertyOptional()
  username?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  season?: string;

  @ApiProperty()
  @IsOptional()
  @IsEnum(CareerTypes)
  type: CareerTypes;
}

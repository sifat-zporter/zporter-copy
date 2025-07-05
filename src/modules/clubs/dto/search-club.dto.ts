import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
// import { listNameCountry } from '../../../common/constants/country';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class SearchClubDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clubName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  // @IsIn(listNameCountry)
  country?: string;
}

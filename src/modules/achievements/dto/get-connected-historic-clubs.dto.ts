import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class GetConnectedHistoricClubsDto extends PaginationDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  userIdQuery?: string;
}

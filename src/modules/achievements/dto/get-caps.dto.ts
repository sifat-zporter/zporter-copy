import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class GetCapsDto extends PaginationDto {
  @ApiProperty({
    description: `this is optional, by default, we get user document Id from header`,
  })
  @IsOptional()
  @IsString()
  userIdQuery?: string;
}

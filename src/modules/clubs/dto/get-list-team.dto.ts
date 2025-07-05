import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { GenderTypes } from '../../../common/constants/common.constant';
import { PaginationDto } from '../../../common/pagination/pagination.dto';
import { UserTypes } from '../../users/enum/user-types.enum';

export class GetListTeamClubDto extends PaginationDto {
  @ApiProperty()
  clubId: string;

  @ApiProperty()
  @IsOptional()
  searchQuery?: string;

  @ApiPropertyOptional({ enum: GenderTypes, default: GenderTypes.Male })
  @IsOptional()
  @IsEnum(GenderTypes)
  gender: GenderTypes;

  @ApiPropertyOptional({ enum: UserTypes, default: UserTypes.PLAYER })
  @IsOptional()
  @IsEnum(UserTypes)
  userType: UserTypes;
}

export class GetListTeamClubV2Dto extends OmitType(GetListTeamClubDto, [
  'startAfter',
]) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;
}

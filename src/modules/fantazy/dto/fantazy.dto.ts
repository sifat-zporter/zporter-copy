import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { GenderTypes } from '../../../common/constants/common.constant';
import { Fantazy } from '../interfaces/fantazy.interface';
import * as moment from 'moment';
import { Type } from 'class-transformer';
import { Role } from '../../diaries/enum/diaries.enum';
import { PaginationDto, SortBy } from '../../../common/pagination/pagination.dto';
import { Age, AgeGroup } from '../../dashboard/dto/dashboard.req.dto';
import { LastDateRange } from '../../dashboard/enum/dashboard-enum';
import { FieldSort, MethodFantazy, PlayerType } from '../enum/fantazy.enum';
import { listNameCountry } from '../../../common/constants/country';

export class UserDetail {
  userId: string;
  type: PlayerType;
  role: Role;
  value: number;
  addedAt: number;
}

export class UserDeleted {
  @ApiProperty()
  @IsString()
  _id: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: PlayerType, default: PlayerType.SUBSTITUE })
  @IsEnum(PlayerType)
  @IsString()
  type: PlayerType;

  @ApiProperty()
  @IsEnum(Role)
  role: Role;

  @ApiHideProperty()
  @IsOptional()
  @IsNumber()
  deletedAt: number;
}


export class UserDetailDto {
  @ApiProperty()
  @IsString()
  _id: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsNumber()
  index: number;

  @ApiProperty({ enum: PlayerType, default: PlayerType.SUBSTITUE })
  @IsEnum(PlayerType)
  @IsString()
  type: PlayerType;

  @ApiProperty()
  @IsEnum(Role)
  role: Role;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  value: number;

  @ApiProperty({ default: +moment.utc().format('x') })
  @IsOptional()
  @IsNumber()
  addedAt: number;
}

export class CreateFantazyTeam implements Fantazy {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  age: string;

  @ApiPropertyOptional({ enum: GenderTypes, default: GenderTypes.Male })
  @IsOptional()
  @IsEnum(GenderTypes)
  gender: GenderTypes;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(listNameCountry)
  country: string;

  @ApiProperty()
  @Type(() => UserDetailDto)
  fantazyTeams: UserDetailDto[];
}

export class UpdateFantazyTeam extends PartialType(CreateFantazyTeam) { }

export class DeletePlayerFantazy {
  @ApiProperty()
  @IsOptional()
  @IsArray()
  usersDeleted: UserDeleted[];
}
export class GetListFantazyTeamQuery extends PaginationDto {
  @ApiPropertyOptional({ enum: GenderTypes, default: '' })
  @IsOptional()
  // @IsEnum(AgeGroup)
  gender?: GenderTypes;

  //# TODO: fix check enum of AgeGroup
  @ApiPropertyOptional({ enum: Age, default: '' })
  @IsOptional()
  // @IsEnum(AgeGroup)
  age?: Age;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(listNameCountry)
  country: string;

  @ApiPropertyOptional({ enum: MethodFantazy, default: '' })
  @IsOptional()
  method?: MethodFantazy

  @ApiProperty({ enum: LastDateRange, default: LastDateRange.SEVEN_DAY })
  @IsEnum(LastDateRange)
  lastDateRange: LastDateRange;
}

export class GetListPlayerQuery extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(listNameCountry)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(Age)
  age: Age;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(GenderTypes)
  gender: GenderTypes;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clubId: string;

  @ApiPropertyOptional({ enum: Role, default: '' })
  @IsOptional()
  @IsEnum(Role)
  roles: string;

  @ApiPropertyOptional({ enum: FieldSort, default: FieldSort.VALUE })
  @IsOptional()
  @IsEnum(FieldSort)
  fieldSort: string;
}

export class OutputFantazyTeam {
  userId: string;
  age: string;
  gender: GenderTypes;
  country: string;
  timeRange: string;
  fantazyTeams: UserDetailDto[];
  usersDeleted: UserDeleted[];
  totalPoint: number;
  isFinished: boolean;
  finishedAt: number;
  createdAt: number;
  updatedAt: number;
}

export class GetListLeaderBoardsOfFantazyTeams extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(listNameCountry)
  country: string;

  @ApiPropertyOptional({ enum: AgeGroup, default: '' })
  @IsOptional()
  @IsEnum(Age)
  age?: Age;

  @ApiPropertyOptional({ enum: GenderTypes, default: '' })
  @IsOptional()
  @IsEnum(GenderTypes)
  gender?: GenderTypes;

  @ApiProperty({ enum: LastDateRange, default: LastDateRange.SEVEN_DAY })
  @IsEnum(LastDateRange)
  lastDateRange: LastDateRange;
}
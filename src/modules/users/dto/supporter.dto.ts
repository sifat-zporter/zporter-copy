import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import {
  SupporterFootballDto,
  UpdateSupporterFootballDto,
} from './supporter/supporter-football';
import { UpdateUserDto, UserDto } from './user.dto';

export class SupporterDto extends UserDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => SupporterFootballDto)
  supporterFootball: SupporterFootballDto;
}

export class CreateSupporterDto extends SupporterDto {
  @ApiProperty()
  @IsUUID(4, { message: 'roleId must be UUIDv4' })
  roleId: string;
}

export class UpdateSupporterDto extends UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSupporterFootballDto)
  supporterFootball: UpdateSupporterFootballDto;
}

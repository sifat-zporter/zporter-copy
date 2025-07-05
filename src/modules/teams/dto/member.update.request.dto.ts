import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsEnum, IsString } from 'class-validator';
import { MemberType, TeamMemberType } from './teams.req.dto';

export class MemberUpdateRequestDto {
  @IsString({ each: true })
  @ArrayNotEmpty()
  memberIds: string[];

  @ApiProperty({ enum: MemberType, default: MemberType.MEMBER })
  @IsEnum(MemberType)
  memberType: MemberType;
}

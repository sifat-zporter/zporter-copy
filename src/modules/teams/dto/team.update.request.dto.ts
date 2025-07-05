import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class TeamUpdateRequestDto {
  @ApiProperty()
  @IsString()
  teamName: string;

  @ApiProperty()
  @IsString()
  teamImage: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isPrivate: boolean;

  @ApiProperty()
  @IsString({ each: true })
  memberIds: string[];
}

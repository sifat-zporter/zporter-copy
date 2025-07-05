import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ITeam } from '../interfaces/team.interface';

export class TeamDto implements ITeam {
  @ApiProperty()
  @IsString()
  teamName: string;

  @ApiProperty()
  @IsString()
  clubId: string;
}

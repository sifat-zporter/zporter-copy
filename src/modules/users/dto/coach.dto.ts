import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { ICoach } from '../interfaces/coaches.interface';
import { CoachCareerDto, UpdateCoachCareerDto } from './coach/coach-career.dto';
import { CoachSkillsDto, UpdateCoachSkillsDto } from './coach/coach-skills.dto';
import { UpdateUserDto, UserDto } from './user.dto';

export class CoachDto extends UserDto implements ICoach {
  @ApiProperty()
  @ValidateNested()
  @Type(() => CoachCareerDto)
  coachCareer: CoachCareerDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CoachSkillsDto)
  coachSkills: CoachSkillsDto;
}

export class CreateCoachDto extends CoachDto {
  @ApiProperty()
  @IsUUID(4, { message: 'roleId must be UUIDv4' })
  roleId: string;
}

export class UpdateCoachDto extends UpdateUserDto {
  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCoachCareerDto)
  coachCareer?: UpdateCoachCareerDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCoachSkillsDto)
  coachSkills?: UpdateCoachSkillsDto;
}

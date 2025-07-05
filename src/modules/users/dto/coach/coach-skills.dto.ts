import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ICoachOverallSkills,
  ICoachRadarSkills,
  ICoachSkills,
} from '../../interfaces/coaches.interface';

export class CoachOverallSkillsDto implements ICoachOverallSkills {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5)
  mental: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5)
  physics: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5)
  tactics: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5)
  technics: number;
}

export class CoachRadarSkillsDto implements ICoachRadarSkills {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  attacking?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  defending?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  turnovers?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  setPieces?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  analytics?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  playerDevelopment?: number;
}

export class CoachSkillsDto implements ICoachSkills {
  @ApiProperty({ default: [] })
  @IsArray()
  @IsString({ each: true })
  specialityTags: string[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => CoachOverallSkillsDto)
  overall: CoachOverallSkillsDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CoachRadarSkillsDto)
  radar: CoachRadarSkillsDto;
}

export class UpdateCoachSkillsDto extends PartialType(CoachSkillsDto) {}

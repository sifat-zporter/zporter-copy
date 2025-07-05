import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  IPlayerOverallSkills,
  IPlayerRadarGKSkills,
  IPlayerRadarSkills,
  IPlayerSkills,
} from '../../interfaces/players.interface';

export class PlayerOverallSkillsDto implements IPlayerOverallSkills {
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

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5)
  leftFoot?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5)
  rightFoot?: number;
}

export class PlayerRadarSkillsDto implements IPlayerRadarSkills {
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
  dribbling?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  passing?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  shooting?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  pace?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  tackling?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  heading?: number;
}

export class PlayerRadarGKSkillsDto implements IPlayerRadarGKSkills {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  vision?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  communication?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  ball_control?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  passing?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  aerial_win?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  shot_dive?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  agility?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  reactions?: number;
}

const defaultSpecialityTags = ['Injury Prone', 'Leadership', 'Team Player'];

export class PlayerSkillsDto implements IPlayerSkills {
  @ApiProperty({ default: defaultSpecialityTags })
  @IsArray()
  @IsString({ each: true })
  specialityTags: string[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => PlayerOverallSkillsDto)
  overall: PlayerOverallSkillsDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => PlayerRadarSkillsDto)
  radar: PlayerRadarSkillsDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => PlayerRadarGKSkillsDto)
  radar_gk: PlayerRadarGKSkillsDto;
}

export class UpdatePlayerSkillsDto extends PartialType(PlayerSkillsDto) {}

export class CoachUpdatePlayerSkillsDto extends PartialType(PlayerSkillsDto) {
  @ApiProperty({ default: 'user bio summary paragraph' })
  @IsOptional()
  @IsString()
  summary: string;
}

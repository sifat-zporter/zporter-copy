import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  PlayerCareerDto,
  UpdatePlayerCareerDto,
} from './player/player-career.dto';
import { UpdateUserDto, UserDto } from './user.dto';
import {
  PlayerSkillsDto,
  UpdatePlayerSkillsDto,
} from './player/player-skills.dto';

export class PlayerDto extends UserDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => PlayerCareerDto)
  playerCareer: PlayerCareerDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => PlayerSkillsDto)
  playerSkills: PlayerSkillsDto;
}

export class CreatePlayerDto extends PlayerDto {
  @ApiProperty()
  @IsUUID(4, { message: 'roleId must be UUIDv4' })
  roleId: string;
}

class CountryType {
  @ApiProperty()
  @IsString()
  alpha2Code: string;

  @ApiProperty()
  @IsString()
  alpha3Code: string;

  @ApiProperty()
  @IsOptional()
  phoneCode?: string;

  @ApiProperty()
  @IsOptional()
  flag: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  region: string;
}

class ClubType {
  @ApiProperty()
  @IsOptional()
  arena?: string;

  @ApiProperty()
  @IsOptional()
  city?: string;

  @ApiProperty()
  @IsString()
  clubId?: string;

  @ApiProperty()
  @IsString()
  clubName?: string;

  @ApiProperty()
  @Type(() => CountryType)
  country?: CountryType | string;

  @ApiProperty()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty()
  @IsOptional()
  nickName?: string;

  @ApiProperty()
  @IsOptional()
  websiteUrl?: string;

  @ApiProperty()
  @IsOptional()
  fromTime?: string;

  @ApiProperty()
  @IsOptional()
  toTime?: string;

  @ApiProperty()
  @IsOptional()
  contractedUntil?: string;
}

class TeamType {
  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiProperty()
  @IsOptional()
  isPrivate?: boolean;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  updatedAt: number;

  @ApiProperty()
  @IsOptional()
  synced?: boolean;

  @ApiProperty()
  @IsString()
  clubId: string;

  @ApiProperty()
  @IsOptional()
  clubName?: string;

  @ApiProperty()
  @IsOptional()
  teamImage?: string;

  @ApiProperty()
  @IsString()
  teamName: string;

  @ApiProperty()
  @IsOptional()
  teamNameAsArray?: string[];

  @ApiProperty()
  @IsOptional()
  clubUrl?: string;

  @ApiProperty()
  @IsOptional()
  clubLogo?: string;

  @ApiProperty()
  @IsOptional()
  memberType?: string;
}

class ExternalClubType {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  country: string;

  @ApiProperty()
  @IsString()
  logoUrl: string;
}

export class AdminCreatePlayerDto {
  @ApiProperty()
  @IsOptional()
  _id?: string;

  @ApiProperty()
  @IsString()
  role: string;

  @ApiProperty()
  @IsOptional()
  email: string;

  @ApiProperty()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsOptional()
  birthDay?: string;

  @ApiProperty()
  @IsOptional()
  gender?: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CountryType)
  @IsOptional()
  country?: CountryType;

  @ApiProperty()
  @IsOptional()
  city?: string;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => ClubType)
  club: ClubType;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => TeamType)
  team?: TeamType[];

  @ApiProperty()
  @IsOptional()
  playerRole?: string;

  @ApiProperty()
  @IsOptional()
  shirtNumber?: number;

  @ApiProperty()
  @ApiProperty()
  @IsOptional()
  height?: number;

  @ApiProperty()
  @IsOptional()
  weight?: number;

  @ApiProperty()
  @IsOptional()
  faceImage?: string;

  @ApiProperty()
  @IsOptional()
  bodyImage?: string;

  @ApiProperty()
  @IsOptional()
  motherEmail?: string;

  @ApiProperty()
  @IsOptional()
  fatherEmail?: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => ExternalClubType)
  externalClub?: ExternalClubType;
}

class HealthValueDto {
  @ApiProperty()
  @IsNumber()
  @IsOptional()
  value: number;
}

class HealthDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => HealthValueDto)
  @IsOptional()
  height: HealthValueDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => HealthValueDto)
  @IsOptional()
  weight: HealthValueDto;
}

class DraftMediaDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  faceImage: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  bodyImage: string;
}

class CountryDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  alpha2Code: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  alpha3Code: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  region: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  flag: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phoneCode: string;
}

class ProfileDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  email: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  parentEmail: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CountryDto)
  @IsOptional()
  birthCountry: CountryDto;

  @ApiProperty()
  @IsDateString()
  @IsOptional()
  birthDay: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  city: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  age: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  gender: string;
}

class DraftPlayerCareerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  clubId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  teamIds: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsOptional()
  favoriteRoles: string[];

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  shirtNumber: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  summary: string;
}

class OverallSkillsDto {
  @ApiProperty()
  @IsNumber()
  @IsOptional()
  mental: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  physics: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  tactics: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  technics: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  leftFoot: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  rightFoot: number;
}

class RadarSkillsDto {
  @ApiProperty()
  @IsNumber()
  @IsOptional()
  attacking: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  defending: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  dribbling: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  passing: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  shooting: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  pace: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  tackling: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  heading: number;
}

class RadarGKSkillsDto {
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

class DraftPlayerSkillsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialityTags: string[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => OverallSkillsDto)
  @IsOptional()
  overall: OverallSkillsDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => RadarSkillsDto)
  @IsOptional()
  radar: RadarSkillsDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => RadarGKSkillsDto)
  @IsOptional()
  radar_gk: RadarGKSkillsDto;
}

export class CoachCreatePlayerDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => HealthDto)
  health: HealthDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DraftMediaDto)
  media: DraftMediaDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ProfileDto)
  profile: ProfileDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DraftPlayerCareerDto)
  playerCareer: DraftPlayerCareerDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DraftPlayerSkillsDto)
  playerSkills: DraftPlayerSkillsDto;
}

export class ConfirmDraftPlayerDto {
  @ApiProperty()
  @IsDateString()
  @IsOptional()
  birthDay: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  email: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  password: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  faceImage: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  bodyImage: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  cardType: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  cardImage: string;
}
export class UpdatePlayerDto extends UpdateUserDto {
  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePlayerCareerDto)
  playerCareer?: UpdatePlayerCareerDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePlayerSkillsDto)
  playerSkills?: UpdatePlayerSkillsDto;
}

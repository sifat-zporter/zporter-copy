import { IsNotEmpty, IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateTeamReqDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
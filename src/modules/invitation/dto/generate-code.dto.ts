import { IsOptional, IsString } from 'class-validator';

export class GenerateCodeDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  inviteCode: string;
}

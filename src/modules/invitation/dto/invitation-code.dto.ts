import { IsString } from 'class-validator';

export class InvitationCodeDto {
  @IsString()
  inviteCode: string;
}

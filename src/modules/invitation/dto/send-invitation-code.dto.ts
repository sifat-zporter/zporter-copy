import { IsString } from 'class-validator';

export class SendInvitationCodeDto {
  @IsString()
  inviteCode: string;

  @IsString({ each: true })
  emails: string[];
}

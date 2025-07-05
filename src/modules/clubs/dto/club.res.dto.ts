import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { JoinTeamStatus } from '../enum/club.enum';

export class ResponseJoinTeamQuery {
  @ApiProperty({ enum: JoinTeamStatus, default: JoinTeamStatus.ACCEPTED })
  @IsEnum(JoinTeamStatus)
  status: JoinTeamStatus;
}

export class ClubInfoDto {
  clubName: string;
  clubLogo: string;
  from: string;
  to: string;
}
export class TransferInfoDto {
  oldClub: ClubInfoDto;
  newClub: ClubInfoDto;
  transferFee: string;
}

export class OutputClubTransferHistories {
  transferInfo: TransferInfoDto;
  userId: string;
  createdAt: number;
  updatedAt: number;
  transferId: string;
}

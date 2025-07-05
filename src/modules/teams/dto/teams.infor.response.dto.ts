import { MemberType } from './teams.req.dto';

export class TeamInforResponseDto {
  teamId: string;
  teamName: string;
  teamImage: string;

  memberType: MemberType;
  userIds: string[];

  clubId: string;
  clubUrl: string;
  clubName: string;
  nickName: string;
  city: string;
  country: string;
  arena: string;
  websiteUrl: string;
}

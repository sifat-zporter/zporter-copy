import { UserInfoDto } from '../../../common/constants/common.constant';
import { Status } from '../enum/friend.enum';

export class OutputListRelationshipDto {
  data: UserInfoDto[];
}

export class OutputFriendRelationship {
  friendStatus: Status;
  followStatus: Status;
  isConfirmBox: boolean;
  isFollowed: boolean;
  isHead2Head?: boolean;
}

export class OutputCountFriendRelationship {
  friendCount: number;
  followCount: number;
  fanCount: number;
}

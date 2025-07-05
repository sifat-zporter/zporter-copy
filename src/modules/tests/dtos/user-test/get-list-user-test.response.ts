import { UserInfoDto } from '../../../../common/constants/common.constant';
import { UserSubtypeResponseByCoach } from './user-subtype.response';

export class ListUserTestResponse {
  userInfo: UserInfoDto = {};
  result: UserSubtypeResponseByCoach[] = [];
  totalIndex: number = 0;
}

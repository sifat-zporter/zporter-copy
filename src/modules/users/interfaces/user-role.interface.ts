import { UserTypes } from '../enum/user-types.enum';

export interface UserAccountRole {
  roleId: string;
  firstName: string;
  lastName: string;
  username: string;
  faceImageUrl: string;
  role: UserTypes | null;
  position: string;
}

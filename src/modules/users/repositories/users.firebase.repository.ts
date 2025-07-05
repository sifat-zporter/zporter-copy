import { fb } from '../../../config/firebase.config';
import { mappingUserInfoById } from '../../../helpers/mapping-user-info';

export class UsersFirebaseService {
  async synchronizeUserInfo(userId: string) {
    const userInfo = await mappingUserInfoById(userId);

    await fb.ref('/users/' + userId).update({
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      type: userInfo.type,
      username: userInfo.username,
      faceImage: userInfo.faceImage,
    });
  }

  async removeUser(userId: string) {
    await fb.ref('/users/' + userId).remove();
  }
}

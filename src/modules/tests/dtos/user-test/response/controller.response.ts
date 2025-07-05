import { UserTypes } from '../../../../users/enum/user-types.enum';

export class ControllerResponse {
  userId: string = '';
  username: string = '';
  link: string = '';
  type: UserTypes = UserTypes.PLAYER;
  fullName: string = '';
  faceImage?: string = '';

  constructor();
  constructor(controllerResponse: ControllerResponse);
  constructor(...args: any[]) {
    if (args.length == 1) {
      return Object.assign(this, args[0]);
    } else {
      return this;
    }
  }
}

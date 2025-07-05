import { MediaDto } from '../../../../diaries/dto/diary.dto';
import { ChangingTurn } from '../../../enums/changing-turn.enum';
import { LogoType } from '../../../enums/logo-type';
import { Metric } from '../../../enums/metric';
import { ControllerResponse } from './controller.response';

export class UserTestLeaderboardResponse {
  id: string;
  subtypeId: string;
  testId: string;

  controller: ControllerResponse;

  userId: string;
  username: string;
  userType: string;
  faceImage: string;

  point: number;

  clubName: string;

  title: string;
  value: number;
  metric: Metric;
  level: string;
  //   changingTurn: ChangingTurn = ChangingTurn.UP;
  typeOfLogo: LogoType | string;

  date: string;
  time: string;
  executedTime: number;
  arena: string;

  media: Array<MediaDto>;

  constructor();
  constructor(userTestResponse: UserTestLeaderboardResponse);
  constructor(...args: UserTestLeaderboardResponse[]) {
    if (args.length) {
      return Object.assign(this, args[0]);
    } else {
      return this;
    }
  }
}

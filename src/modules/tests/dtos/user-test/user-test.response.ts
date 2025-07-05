import e from 'express';
import { MediaDto } from '../../../diaries/dto/diary.dto';
import { UserTypes } from '../../../users/enum/user-types.enum';
import { ChangingTurn } from '../../enums/changing-turn.enum';
import { LogoType } from '../../enums/logo-type';
import { Metric } from '../../enums/metric';
import { ControllerResponse } from './response/controller.response';

export class UserTestResponse {
  id: string = '';
  nameOfTest: string = '';
  subtypeId: string = '';
  testId: string = '';

  controller: ControllerResponse;

  point: number = -1;

  title: string = '';
  value: number = 0;
  metric: Metric = Metric.KILOGRAM;
  level: string = '';
  changingTurn: ChangingTurn = ChangingTurn.UP;
  typeOfLogo: LogoType | string = LogoType.CHINS;

  date: string = '';
  time: string = '';
  executedTime: number = 0;
  arena: string = '';

  userId: string = '';
  media: Array<MediaDto> = [];

  isPublic: boolean = true;
  isVerified: boolean = false;
  isDeleted: boolean = false;

  constructor();
  constructor(userTestResponse: Partial<UserTestResponse>);
  constructor(...args: UserTestResponse[]) {
    if (args.length) {
      return Object.assign(this, args[0]);
    } else {
      return this;
    }
  }
}

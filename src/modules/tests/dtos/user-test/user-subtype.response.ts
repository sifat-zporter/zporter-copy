import { OmitType } from '@nestjs/swagger';
import { ChangingTurn } from '../../enums/changing-turn.enum';
import { TestLevel } from '../../enums/test-level';
import { TestType } from '../../enums/test-type';
import { UserTestResponse } from './user-test.response';

export class UserSubtypeResponse {
  id: string = '';
  typeOfTest: TestType = TestType.PHYSICAL;
  subtypeName: string = '';

  tests?: UserTestResponse[] = [];

  avgPoint: number = -1;
  changingTurn: ChangingTurn = ChangingTurn.UP;
  level: TestLevel = TestLevel.AMATEUR;

  isDeleted: boolean = false;
}

export class UserSubtypeResponseByCoach extends OmitType(UserSubtypeResponse, [
  'tests',
]) {}

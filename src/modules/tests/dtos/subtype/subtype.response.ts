import { ChangingTurn } from '../../enums/changing-turn.enum';
import { TestLevel } from '../../enums/test-level';
import { TestType } from '../../enums/test-type';
import { TestResponse } from '../test/test.response';

export class SubtypeResponse {
  id: string = '';
  typeOfTest: TestType = TestType.PHYSICAL;
  subtypeName: string = '';

  tests: TestResponse[] = [];

  avgPoint: number = -1;
  changingTurn: ChangingTurn = ChangingTurn.UP;
  level: TestLevel = TestLevel.AMATEUR;

  isDeleted: boolean = false;

  constructor(subtypeResponse: SubtypeResponse);
  constructor();
  constructor(...args: any[]) {
    if (args.length == 1) {
      return Object.assign(this, args[0]);
    } else {
      return new SubtypeResponse();
    }
  }
}

import { GetLeaderboardRequest } from '../../../dtos/user-test/request/get-leader-board.request';
import { UserTestLeaderboardResponse } from '../../../dtos/user-test/response/user-test.leaderboard.response';
import { TestType } from '../../../enums/test-type';
import { Subtype } from '../../../repository/subtype/subtype';
import { UserTest } from '../../../repository/user-test/user-test';

export interface IMinorUserTestService {
  generateLeaderboardCondition(getLeaderboard: GetLeaderboardRequest): Object[];

  generateLeaderboardResponse(
    userTest: UserTest,
  ): Promise<UserTestLeaderboardResponse>;
  getSubtypeOfTest(typeOfTest: TestType): Promise<Subtype[]>;
}

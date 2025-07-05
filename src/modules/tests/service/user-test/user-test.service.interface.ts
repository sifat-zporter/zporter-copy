import { GenderTypes } from '../../../../common/constants/common.constant';
import { LastDateRange } from '../../../dashboard/enum/dashboard-enum';
import { GetUserTestRequest } from '../../dtos/user-test/get-user-test.request';
import { GetLeaderboardRequest } from '../../dtos/user-test/request/get-leader-board.request';
import { UpdateUserTestRequest } from '../../dtos/user-test/request/update-user-test.request';
import { ControllerResponse } from '../../dtos/user-test/response/controller.response';
import { ChartResponse } from '../../dtos/user-test/response/individual-chart.response';
import { LeaderboardResponse } from '../../dtos/user-test/response/leaderboard.response';
import { TableSequence } from '../../dtos/user-test/table-sequence';
import { UserSubtypeResponse } from '../../dtos/user-test/user-subtype.response';
import {
  UserTestRequest,
  UserTestRequestForCoach,
} from '../../dtos/user-test/request/user-test.request';
import { UserTestResponse } from '../../dtos/user-test/user-test.response';
import { TestLevel } from '../../enums/test-level';
import {
  GetListUserTestByCategory,
  GetUserTestByType,
} from '../../dtos/user-test/request/get-user-test-by-type.request';
import { UserTest } from '../../repository/user-test/user-test';
import { ListUserTestResponse } from '../../dtos/user-test/get-list-user-test.response';
import { GetIndividualChartRequest } from '../../dtos/user-test/request/get-individual-char.request';

export interface IUserTestService {
  validateNotFoundUserTest(userTestId: string): Promise<void>;
  verifyUserTest(
    currentUserId: string,
    userTestId: string,
    isVerified: boolean,
  ): Promise<void>;

  tableSequence(
    subtypeId: string,
    testId: string,
    gender?: GenderTypes,
  ): Promise<TableSequence>;

  createUserTest(
    userTestDto: UserTestRequest,
    currentUserId: string,
    timezone: string,
  ): Promise<UserTest>;

  createUserTestByCoach(
    userTestCoachDto: UserTestRequestForCoach,
    currentUserId: string,
    timezone: string,
  ): Promise<void>;

  classifyPoint(point: number): TestLevel;

  shareUserTestResult(userTestId: string, currentUserId: string): Promise<void>;

  getListUserTestResults(
    currentUserId?: string,
    userTestQuery?: GetUserTestByType,
  ): Promise<UserSubtypeResponse[]>;

  getListUserTestResultsByCoach(
    currentUserId: string,
    request: GetListUserTestByCategory,
  ): Promise<ListUserTestResponse[]>;

  getUserTestResult(
    currentUserId: string,
    getUserTestRequest: GetUserTestRequest,
  ): Promise<UserTestResponse[]>;

  getListLeaderboard(
    getLeaderboard: GetLeaderboardRequest,
  ): Promise<LeaderboardResponse>;

  getIndividualTestChart(
    currentUserId: string,
    getChart: GetIndividualChartRequest,
  ): Promise<ChartResponse>;

  updateUserTest(
    currentUserId: string,
    userTestRequest: UpdateUserTestRequest,
    userTestId: string,
    timezone: string,
  ): Promise<void>;

  deleteUserTest(userTestId: string, currentUserId: string): Promise<void>;

  mappingControllerInfo(controllerId: string): Promise<ControllerResponse>;

  getListRecentController(currentUserId: string): Promise<ControllerResponse[]>;
}

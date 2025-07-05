import { SortBy } from '../../../../common/pagination/pagination.dto';
import { ICommonRepository } from '../../../abstract/interface/common-repository.interface';
import { Sequence } from '../../enums/sequence';
import { UserTest } from './user-test';

export interface IUserTestRepository extends ICommonRepository<UserTest> {
  getLastVerifiedUserTest(
    testId: string,
    userId: string,
    project: { [key in keyof UserTest]?: 1 | 0 },
  ): Promise<UserTest>;

  getBeforeUserTest(
    testId: string,
    userId: string,
    userTestId: string,
    project: { [key in keyof UserTest]?: 1 | 0 },
  ): Promise<UserTest>;

  getBeforeUserTest(
    testId: string,
    userId: string,
    userTestId: string,
    project: { [key in keyof UserTest]?: 1 | 0 },
  ): Promise<UserTest>;

  getTwoLastUserTest(
    subtypeId: string,
    testId: string,
    userId: string,
  ): Promise<UserTest[]>;

  getUserTestByQuery(
    userId: string,
    testId: string,
    startTime: number,
    endTime: number,
    page: number,
    pageSize: number,
    keySort: SortBy,
  ): Promise<UserTest[]>;

  getLeaderboardResult(
    matchCondition: any[],
    startTime: number,
    endTime: number,
    page: number,
    pageSize: number,
    sort: Sequence,
  ): Promise<UserTest[]>;
}

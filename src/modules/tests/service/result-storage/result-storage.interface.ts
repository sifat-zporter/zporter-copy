import { INewCommonRepository } from '../../../abstract/interface/new-common-repository.interface';
import { LastDateRange } from '../../../dashboard/enum/dashboard-enum';
import { GetTotalChartRequest } from '../../dtos/user-test/request/get-total-chart.request';
import { ChartResponse } from '../../dtos/user-test/response/individual-chart.response';
import { TestType } from '../../enums/test-type';
import { ResultStorage } from '../../repository/result-storage/result-storage';
import { UserTest } from '../../repository/user-test/user-test';

export interface IResultStorageService {
  createResultStorage(userTest: UserTest): Promise<void>;

  getTotalTestChart(
    currentUserId: string,
    getChart: GetTotalChartRequest,
  ): Promise<ChartResponse>;
}

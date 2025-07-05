import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import mongoose from 'mongoose';
import { DateFormat } from '../../../../utils/date-util';
import { AbstractService } from '../../../abstract/abstract.service';
import { ConditionObject } from '../../../abstract/dto/pipeline.dto';
import { UsersService } from '../../../users/v1/users.service';
import { NodeChart } from '../../dtos/user-test/response/chart-node';
import { ChartResponse } from '../../dtos/user-test/response/individual-chart.response';
import { UserSubtypeResponse } from '../../dtos/user-test/user-subtype.response';
import { TestType } from '../../enums/test-type';
import { ResultStorage } from '../../repository/result-storage/result-storage';
import { ResultStorageRepository } from '../../repository/result-storage/result-storage.repository';
import { IResultStorageRepository } from '../../repository/result-storage/result-storage.repository.interface';
import { Subtype } from '../../repository/subtype/subtype';
import { SubtypeRepository } from '../../repository/subtype/subtype.repository';
import { ISubtypeRepository } from '../../repository/subtype/subtype.repository.interface';
import { UserTest } from '../../repository/user-test/user-test';
import { UserTestService } from '../user-test/user-test.service';
import { IUserTestService } from '../user-test/user-test.service.interface';
import { IResultStorageService } from './result-storage.interface';
import { GetTotalChartRequest } from '../../dtos/user-test/request/get-total-chart.request';

@Injectable()
export class ResultStorageService
  extends AbstractService<IResultStorageRepository>
  implements IResultStorageService
{
  constructor(
    @Inject(ResultStorageRepository)
    private readonly resultStorageRepository: IResultStorageRepository,
    @Inject(SubtypeRepository)
    private readonly subtypeRepository: ISubtypeRepository,
    @Inject(forwardRef(() => UserTestService))
    private readonly userTestService: IUserTestService,

    @Inject(UsersService)
    private readonly userService: UsersService,
  ) {
    super(resultStorageRepository);
  }

  //# TODO: need add this work to Queue for handling later
  async createResultStorage(userTest: UserTest): Promise<void> {
    const subtype: Subtype = await this.subtypeRepository.getOne(
      { _id: userTest.subtypeId },
      { _id: 1, testType: 1 },
    );
    const userTestResults: UserSubtypeResponse[] =
      await this.userTestService.getListUserTestResults(userTest.userId, {
        typeOfTest: subtype.testType,
      });

    const avgIndex: number =
      userTestResults.length > 0
        ? userTestResults.reduce((prev, curr, _, array) => {
            if (curr.avgPoint == -1) {
              return prev + 0 / userTestResults.length;
            } else {
              return prev + curr.avgPoint / userTestResults.length;
            }
          }, 0)
        : -1;
    const resultStorage: ResultStorage = {
      _id: new mongoose.Types.ObjectId(),
      avgIndexPoint: Math.floor(avgIndex),
      level: this.userTestService.classifyPoint(avgIndex),
      listResponses: userTestResults,
      testType: subtype.testType,
      userId: userTest.userId,
      verifiedTime: this.dateUtil.getNowTimeInMilisecond(),
    };
    await this.repository.createOrUpdate(resultStorage, {
      _id: resultStorage._id.toString(),
    });
  }

  async getAvgPointLastNode(
    currentUserId: string,
    typeOfTest: TestType,
  ): Promise<number> {
    let totalPointsActive = 0;
    const resultStorage = await this.userTestService.getListUserTestResults(
      currentUserId,
      {
        typeOfTest: typeOfTest,
      },
    );
    const sumPoints = resultStorage.reduce((sum, cur) => {
      if (cur.avgPoint === -1) {
        return sum;
      }
      totalPointsActive += 1;
      return sum + cur.avgPoint;
    }, 0);

    return Math.floor(
      !totalPointsActive ? 0 : Math.round(sumPoints / totalPointsActive),
    );
  }

  async getTotalTestChart(
    currentUserId: string,
    getChart: GetTotalChartRequest,
  ): Promise<ChartResponse> {
    const NUMBER_OF_POINTS_IN_CHART = 6;
    const { lastDateRange, testType, userIdQuery } = getChart;
    const userId = userIdQuery ? userIdQuery : currentUserId;
    await this.userService.validateUserId(userId);

    const dateRanges = this.dateUtil.getArrayDateRangeForChart(
      lastDateRange,
      NUMBER_OF_POINTS_IN_CHART,
    );

    let nodes: NodeChart[] = await Promise.all(
      dateRanges.map(async (periodDate, index): Promise<NodeChart> => {
        const { startTime, endTime } = periodDate;
        const fromDateString: string = this.dateUtil.convertToDateFormat(
          startTime,
          DateFormat.MM_DD_YYYY,
        );
        const toDateString: string = this.dateUtil.convertToDateFormat(
          endTime,
          DateFormat.MM_DD_YYYY,
        );
        let resultStorageAmongTime: ResultStorage[];

        if (index === NUMBER_OF_POINTS_IN_CHART - 1) {
          const avgPoint = await this.getAvgPointLastNode(userId, testType);

          return new NodeChart({
            index,
            point: avgPoint,
            level: this.userTestService.classifyPoint(avgPoint),
            day: `${fromDateString} - ${toDateString}`,
          });
        } else {
          resultStorageAmongTime = await this.repository.customedFind({
            match: {
              userId,
              testType,
              verifiedTime: {
                $gte: startTime,
                $lte: endTime,
              } as ConditionObject,
            },
          });

          if (!resultStorageAmongTime.length) {
            return new NodeChart({});
          }

          const maxResultStorage: ResultStorage = resultStorageAmongTime.find(
            (e) =>
              e.avgIndexPoint ==
              Math.max(...resultStorageAmongTime.map((o) => o.avgIndexPoint)),
          );

          return new NodeChart({
            index,
            point: maxResultStorage.avgIndexPoint,
            level: maxResultStorage.level,
            day: `${fromDateString} - ${toDateString}`,
          });
        }
      }),
    );

    const chart: ChartResponse = new ChartResponse({
      numberNodes: nodes.length,
      nodes,
    });

    return chart;
  }
}

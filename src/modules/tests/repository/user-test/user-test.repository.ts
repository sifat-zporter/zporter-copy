import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FilterQuery } from 'typeorm';
import { SortBy } from '../../../../common/pagination/pagination.dto';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { PipelineDto } from '../../../abstract/dto/pipeline.dto';
import { ICommonRepository } from '../../../abstract/interface/common-repository.interface';
import { UserTest, USER_TEST_MODEL } from './user-test';
import { IUserTestRepository } from './user-test.repository.interface';
import { Sequence } from '../../enums/sequence';

@Injectable()
export class UserTestRepository
  extends AbstractMongoRepository<UserTest>
  implements IUserTestRepository, ICommonRepository<UserTest>
{
  constructor(
    @InjectModel(USER_TEST_MODEL)
    private userTestsModel: Model<UserTest>,
  ) {
    super(userTestsModel);
    this.initIndex(
      {
        subtype: 1,
        _id: 1,
        testId: 1,
        executedTime: 1,
        userId: 1,
        isDeleted: 1,
        isVerified: 1,
      },
      'user-test-indexes',
    );

    const _1WeekSeconds: number = 6048000; // 1 week seconds = 604800
    this.initTTL(
      {
        deletedAt: 1,
      },
      'TTL-index',
      _1WeekSeconds,
    );
  }
  async getTwoLastUserTest(
    subtypeId: string,
    testId: string,
    userId: string,
  ): Promise<UserTest[]> {
    try {
      const doc = await this.entityModel.aggregate([
        {
          $match: {
            subtypeId: subtypeId,
            testId: testId,
            userId: userId,
            isDeleted: false,
            isVerified: true,
          },
        },
        {
          $sort: {
            executedTime: -1,
          },
        },
        {
          $limit: 2,
        },
      ]);

      return doc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async createOrUpdate(
    doc: UserTest,
    filterQuery?: FilterQuery<UserTest>,
  ): Promise<UserTest> {
    try {
      const newFilterQuery: FilterQuery<UserTest> = filterQuery
        ? { ...filterQuery, isDeleted: false }
        : { ...doc, isDeleted: false };

      const newDoc: UserTest = await this.entityModel.findOneAndUpdate(
        newFilterQuery,
        {
          ...doc,
          updatedAt: this.dateUtil.getNowTimeInMilisecond(),
        },
        {
          upsert: true,
          new: true,
        },
      );
      return newDoc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async deleteHard(filterQuery: FilterQuery<UserTest>): Promise<void> {
    await this.entityModel.deleteMany(filterQuery);
  }

  async get(pipelineDto: PipelineDto<UserTest>): Promise<UserTest[]> {
    try {
      const pipeline = this.generatePipelineAggregate(pipelineDto);

      return await this.entityModel.aggregate(
        this.generateAggregateArray(pipeline),
      );
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async getOne(
    entityFilterQuery: FilterQuery<UserTest>,
    projection?: any,
  ): Promise<UserTest> {
    this.validateObjectId(entityFilterQuery);
    try {
      const doc = await this.entityModel.findOne(entityFilterQuery, projection);
      return doc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async count(entityFilterQuery: FilterQuery<UserTest>): Promise<number> {
    return await this.entityModel.count(entityFilterQuery);
  }

  async getLastVerifiedUserTest(
    testId: string,
    userId: string,
    project: { [key in keyof UserTest]?: 1 | 0 },
  ): Promise<UserTest> {
    try {
      const doc = await this.entityModel.aggregate([
        {
          $match: {
            testId: testId,
            userId: userId,
            isDeleted: false,
            isVerified: true,
          },
        },
        {
          $sort: {
            executedTime: -1,
          },
        },
        {
          $limit: 1,
        },
        {
          $project: project,
        },
      ]);

      if (doc.length) {
        return doc[0] as UserTest;
      } else {
        return null;
      }
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async getBeforeUserTest(
    testId: string,
    userId: string,
    userTestId: string,
    project: { [key in keyof UserTest]?: 1 | 0 },
  ): Promise<UserTest> {
    try {
      const userTest: UserTest = await this.getOne(
        { _id: userTestId },
        { _id: 1, executedTime: 1 },
      );
      const doc = await this.entityModel.aggregate([
        {
          $match: {
            testId: testId,
            userId: userId,
            isDeleted: false,
            isVerified: true,
            executedTime: {
              $lt: userTest.executedTime,
            },
          },
        },
        {
          $sort: {
            executedTime: -1,
          },
        },
        {
          $limit: 1,
        },
        {
          $project: project,
        },
      ]);

      if (doc.length) {
        return doc[0] as UserTest;
      } else {
        return null;
      }
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async getUserTestByQuery(
    userId: string,
    testId: string,
    startTime: number,
    endTime: number,
    page: number,
    pageSize: number,
    keySort: SortBy,
  ): Promise<UserTest[]> {
    const sort: 1 | -1 = keySort == SortBy.ASC ? 1 : -1;
    const userTests: UserTest[] = await this.entityModel.aggregate([
      {
        $match: {
          userId,
          testId,
          isDeleted: false,
          executedTime: {
            $gte: startTime,
          },
        },
      },
      {
        $match: {
          executedTime: {
            $lte: endTime,
          },
        },
      },
      {
        $sort: {
          executedTime: sort,
        },
      },
      {
        $limit: pageSize * page,
      },
      {
        $skip: pageSize * (page - 1),
      },
    ]);
    return userTests;
  }

  async getLeaderboardResult(
    matchCondition: any[],
    startTime: number,
    endTime: number,
    page: number,
    pageSize: number,
    sort: Sequence,
  ): Promise<UserTest[]> {
    const conditionOption: {
      group: any;
      sort: any;
    } =
      sort == Sequence.INCREASING
        ? {
            group: {
              $group: {
                _id: '$userId',
                rankingValue: { $max: '$value' },
                userTest: { $push: '$$ROOT' },
              },
              // $group: conditionOption.group,
            },
            sort: {
              $sort: {
                executedTime: -1,
                rankingValue: -1,
              },
              // $sort: conditionOption.sort,
            },
          }
        : {
            group: {
              $group: {
                _id: '$userId',
                rankingValue: { $min: '$value' },
                userTest: { $push: '$$ROOT' },
              },
              // $group: conditionOption.group,
            },
            sort: {
              $sort: {
                rankingValue: 1,
                executedTime: -1,
              },
              // $sort: conditionOption.sort,
            },
          };
    const userTests: any[] = await this.entityModel.aggregate([
      {
        $match: {
          $and: [
            ...matchCondition,
            { isVerified: true },
            { isDeleted: false },
            { executedTime: { $gte: startTime } },
            // { executedTime: { $lte: endTime } },
          ],
        },
      },
      conditionOption.group,

      // {
      //   $group: {
      //     _id: '$userId',
      //     valueMax: { $max: '$value' },
      //     userTest: { $push: '$$ROOT' },
      //   },
      //   // $group: conditionOption.group,
      // },
      // `$redact` for getting only the one-max value for each user
      {
        $redact: {
          $cond: [
            {
              $eq: [
                { $ifNull: ['$value', '$$ROOT.rankingValue'] },
                '$$ROOT.rankingValue',
              ],
            },
            '$$DESCEND',
            '$$PRUNE',
          ],
        },
      },
      // {
      //   $sort: {
      //     executedTime: -1,
      //     valueMax: -1,
      //   },
      //   // $sort: conditionOption.sort,
      // },
      conditionOption.sort,
      {
        $limit: pageSize * page,
      },
      {
        $skip: pageSize * (page - 1),
      },
    ]);
    return userTests.map((e) => e.userTest[0]) as UserTest[];
  }
}

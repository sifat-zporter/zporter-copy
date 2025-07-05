import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import mongoose from 'mongoose';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { AbstractService } from '../../../abstract/abstract.service';
import { MediaDto } from '../../../diaries/dto/diary.dto';
import { SubtypeRequest } from '../../dtos/subtype/subtype.request';
import { SubtypeResponse } from '../../dtos/subtype/subtype.response';
import { TestResponse } from '../../dtos/test/test.response';
import { ChangingTurn } from '../../enums/changing-turn.enum';
import { TestLevel } from '../../enums/test-level';
import { TestType } from '../../enums/test-type';
import { Subtype } from '../../repository/subtype/subtype';
import { SubtypeRepository } from '../../repository/subtype/subtype.repository';
import { ISubtypeRepository } from '../../repository/subtype/subtype.repository.interface';
import { ISubtypeService } from './subtype.service.interface';

export class SubtypeService
  extends AbstractService<ISubtypeRepository>
  implements ISubtypeService
{
  constructor(
    @Inject(SubtypeRepository)
    private readonly subtypeRepository: ISubtypeRepository,
  ) {
    super(subtypeRepository);
  }
  async validateNotFoundSubtype(subtypeId: string): Promise<void> {
    const subtype: number = await this.repository.count({
      _id: subtypeId,
    });
    if (!subtype) {
      throw new NotFoundException(ResponseMessage.Test.SUBTYPE_NOT_FOUND);
    }
  }

  async validateExistedSubtypeName(
    subtypeName: string,
    testType: TestType,
    subtypeId?: string,
  ): Promise<void> {
    const numberSubtype: number = subtypeId
      ? await this.repository.count({
          _id: { $ne: subtypeId },
          subtypeName: subtypeName,
          testType: testType,
          isDeleted: false,
        })
      : await this.repository.count({
          subtypeName: subtypeName,
          testType: testType,
          isDeleted: false,
        });

    if (numberSubtype) {
      throw new BadRequestException(ResponseMessage.Test.SUBTYPE_EXISTED_NAME);
    }
  }

  async createSubtype(
    subtypeDto: SubtypeRequest,
    currentUserId: string,
  ): Promise<void> {
    await this.validateExistedSubtypeName(
      subtypeDto.subtype,
      subtypeDto.typeOfTest,
    );

    const now: number = this.dateUtil.getNowTimeInMilisecond();
    const subtype: Subtype = new Subtype({
      _id: new mongoose.Types.ObjectId(),
      subtypeName: subtypeDto.subtype,
      testType: subtypeDto.typeOfTest,
      tests: [],
      deletedTests: [],
      createdBy: currentUserId,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
    await this.repository.createOrUpdate(subtype);
  }

  async updateSubtype(
    updateSubtypeDto: SubtypeRequest,
    subtypeId: string,
  ): Promise<void> {
    await Promise.all([
      this.validateExistedSubtypeName(
        updateSubtypeDto.subtype,
        updateSubtypeDto.typeOfTest,
        subtypeId,
      ),
      this.validateNotFoundSubtype(subtypeId),
    ]);

    const subtype: Subtype = await this.repository.getOne({ _id: subtypeId });
    const now: number = this.dateUtil.getNowTimeInMilisecond();

    subtype.subtypeName = updateSubtypeDto.subtype;
    subtype.testType = updateSubtypeDto.typeOfTest;
    subtype.updatedAt = now;

    await this.repository.createOrUpdate(subtype, { _id: subtypeId });
  }

  async getSubtypeById(subtypeId: string): Promise<SubtypeResponse> {
    await this.validateNotFoundSubtype(subtypeId);
    const subtype: Subtype = await this.repository.getOne({ _id: subtypeId });

    const subtypeResponse: SubtypeResponse = new SubtypeResponse({
      id: subtype._id.toString(),
      subtypeName: subtype.subtypeName,
      typeOfTest: subtype.testType,
      isDeleted: subtype.isDeleted,

      // TODO: need to have function for processing these things before response
      avgPoint: -1,
      changingTurn: ChangingTurn.UP,
      level: TestLevel.AMATEUR,
      tests: subtype.tests
        .filter((e) => e.isDeleted == false)
        .map((test) => {
          const testResponse: TestResponse = {
            id: test._id.toString(),
            subtypeId: test.subtypeId,
            testName: test.testName,
            logoType: test.logoType,
            media: test.media.map((e) => {
              const mediaDto: MediaDto = {
                source: e.source,
                thumbnail: e.thumbnail,
                type: e.type,
                uniqueKey: e.uniqueKey,
                url: e.url,
              };
              return mediaDto;
            }),
            generalInfo: {
              isPublic: true,
              kindOfExercise: {
                numberOfPeople: test.numberOfPeople,
                place: test.place,
              },
              timeExercise: {
                period: test.period,
                time: test.time,
              },
            },
            numberOfPeople: test.numberOfPeople,
            description: test.description,
            tableDescription: test.tableDescription,
            table: test.table,
            title: test.title,
            placeholder: test.placeholder,
            metric: test.metric,
            isDeleted: test.isDeleted,
            linkShare: `${process.env.WEB_BASE_URL}/tests/physical/${
              test.subtypeId
            }/${test._id.toString()}`,
          };

          return testResponse;
        }),
    });

    return subtypeResponse;
  }

  async getSubtypeByTestType(
    type: TestType,
    page: number,
    pageSize: number,
  ): Promise<SubtypeResponse[]> {
    const subtypes: Subtype[] = await this.repository.get({
      match: {
        testType: type,
        isDeleted: false,
      },
      page,
      pageSize,
    });
    const subtypeResponses: SubtypeResponse[] = subtypes.map(
      (e) =>
        new SubtypeResponse({
          id: e._id.toString(),
          subtypeName: e.subtypeName,
          typeOfTest: e.testType,
          isDeleted: e.isDeleted,

          // TODO: need to have function for processing these things before response
          avgPoint: -1,
          changingTurn: ChangingTurn.UP,
          level: TestLevel.AMATEUR,
          tests: e.tests
            .filter((e) => e.isDeleted == false)
            .map((test) => {
              const testResponse: TestResponse = {
                id: test._id.toString(),
                subtypeId: test.subtypeId,
                testName: test.testName,
                logoType: test.logoType,
                media: test.media.map((e) => {
                  const mediaDto: MediaDto = {
                    source: e.source,
                    thumbnail: e.thumbnail,
                    type: e.type,
                    uniqueKey: e.uniqueKey,
                    url: e.url,
                  };
                  return mediaDto;
                }),
                generalInfo: {
                  isPublic: true,
                  kindOfExercise: {
                    numberOfPeople: test.numberOfPeople,
                    place: test.place,
                  },
                  timeExercise: {
                    period: test.period,
                    time: test.time,
                  },
                },
                numberOfPeople: test.numberOfPeople,
                description: test.description,
                tableDescription: test.tableDescription,
                table: test.table,
                title: test.title,
                placeholder: test.placeholder,
                metric: test.metric,
                isDeleted: test.isDeleted,
                linkShare: `${process.env.WEB_BASE_URL}/tests/physical/${
                  test.subtypeId
                }/${test._id.toString()}`,
              };

              return testResponse;
            }),
        }),
    );
    return subtypeResponses;
  }

  async deleteSubtype(subtypeId: string): Promise<void> {
    await this.validateNotFoundSubtype(subtypeId);
    const subtype: Subtype = await this.repository.getOne({
      _id: subtypeId,
    });
    subtype.isDeleted = true;
    await this.repository.createOrUpdate(subtype, { _id: subtypeId });
  }
}

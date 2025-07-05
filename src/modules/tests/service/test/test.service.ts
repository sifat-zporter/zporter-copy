import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import mongoose from 'mongoose';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { db } from '../../../../config/firebase.config';
import { MediaUtil } from '../../../../utils/media-util';
import { normalizeTextFormula } from '../../../../utils/normalize-text';
import { removeDuplicatedElement } from '../../../../utils/remove-duplicated-elements';
import { AbstractService } from '../../../abstract/abstract.service';
import { MediaDto } from '../../../diaries/dto/diary.dto';
import { TestResponse } from '../../dtos/test/test.response';
import { TestsDto } from '../../dtos/test/tests.dto';
import { Sequence } from '../../enums/sequence';
import { TestType } from '../../enums/test-type';
import { Subtype } from '../../repository/subtype/subtype';
import { SubtypeRepository } from '../../repository/subtype/subtype.repository';
import { ISubtypeRepository } from '../../repository/subtype/subtype.repository.interface';
import { MediaSource } from '../../repository/test/media-source';
import { Reference } from '../../repository/test/reference';
import { Test } from '../../repository/test/test';
import { SubtypeService } from '../subtype/subtype.service';
import { ISubtypeService } from '../subtype/subtype.service.interface';
import { ITestService } from './test.service.interface';

@Injectable()
export class TestService
  extends AbstractService<ISubtypeRepository>
  implements ITestService
{
  constructor(
    @Inject(SubtypeRepository)
    private readonly subtypeRespository: ISubtypeRepository,
    @Inject(SubtypeService)
    private readonly subtypeService: ISubtypeService,
  ) {
    super(subtypeRespository);
  }

  async duplicateTest(
    subtypeId: string,
    testId: string,
    currentUserId: string,
  ): Promise<void> {
    await Promise.all([
      this.subtypeService.validateNotFoundSubtype(subtypeId),
      this.validateNotFoundTest(subtypeId, testId),
    ]);

    const subtype: Subtype = await this.repository.getOne({ _id: subtypeId });
    const test: Test = subtype.tests.find((e) => e._id.toString() == testId);

    const newName: string = `${test.testName}(copy)`.trim().normalize('NFC');
    const isNameExisted: boolean = subtype.tests.some(
      (e) => e.testName == newName,
    );
    if (isNameExisted) {
      throw new BadRequestException(
        ResponseMessage.Test.TEST_EXISTED_NAME_IN_DUPLICATE,
      );
    }

    const now: number = this.dateUtil.getNowTimeInMilisecond();

    const newTest: Test = JSON.parse(JSON.stringify(test));
    newTest._id = new mongoose.Types.ObjectId();
    newTest.createdBy = currentUserId;
    newTest.testName = newName;
    newTest.createdAt = now;
    newTest.updatedAt = now;

    subtype.tests.push(newTest);
    await this.repository.createOrUpdate(subtype, {
      _id: subtypeId,
    });
  }

  async validateNotFoundTest(subtypeId: string, testId: string): Promise<void> {
    const subtype: Subtype = await this.repository.getOne(
      { _id: subtypeId },
      // testId,
      // false,
      { tests: 1 },
    );

    const tests: Test[] = subtype.tests.filter(
      (e) => testId == e._id.toString(),
    );
    if (!tests.length) {
      throw new NotFoundException(ResponseMessage.Test.TEST_NOT_FOUND);
    }
  }

  async createTests(
    subtypeId: string,
    testsDto: TestsDto,
    currentUserId: string,
  ): Promise<void> {
    await this.validateExistedTestName(subtypeId, testsDto.nameOfTest);

    const subtype: Subtype = await this.repository.getOne({
      _id: subtypeId,
    });
    if (!subtype) {
      throw new NotFoundException(ResponseMessage.Test.SUBTYPE_NOT_FOUND);
    }

    const now: number = this.dateUtil.getNowTimeInMilisecond();
    const test: Test = {
      _id: new mongoose.Types.ObjectId(),
      createdBy: currentUserId,
      subtypeId: testsDto.subtypeId,
      testName: testsDto.nameOfTest,
      logoType: testsDto.typeOfLogo,
      media: testsDto.media.map((media) => {
        const mediaDto: MediaDto = new MediaUtil().processThumbnailVideo(media);
        return new MediaSource({
          source: mediaDto.source,
          thumbnail: mediaDto.thumbnail,
          type: mediaDto.type,
          uniqueKey: mediaDto.uniqueKey,
          url: mediaDto.url,
        });
      }),
      description: testsDto.description,
      tableDescription: testsDto.tableDescription,
      table: testsDto.table,
      title: testsDto.title,
      placeholder: testsDto.placeholder,
      metric: testsDto.metric,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,

      numberOfPeople: testsDto.generalInfo.kindOfExercise.numberOfPeople,
      place: testsDto.generalInfo.kindOfExercise.place,
      time: testsDto.generalInfo.timeExercise.time,
      period: testsDto.generalInfo.timeExercise.period,
      references: [],
      sequence: await this.getTestSequence(
        testsDto.nameOfTest,
        subtype.testType,
      ),
    };

    subtype.tests.push(test);
    subtype.updatedAt = now;
    await this.repository.createOrUpdate(subtype, { _id: subtypeId });
  }

  async createReference(subtypeId: string, testIds: string[]): Promise<void> {
    const pureTestIds: string[] = removeDuplicatedElement(testIds);
    const subtype: Subtype = await this.subtypeRespository.getOne({
      _id: subtypeId,
    });
    if (!subtype) {
      throw new NotFoundException(ResponseMessage.Test.SUBTYPE_NOT_FOUND);
    }

    const subtypeTestIds = subtype.tests.map((e) => e._id.toString());
    const checkTestIdsIncludeSubtype: boolean = pureTestIds.every((e) =>
      subtypeTestIds.includes(e),
    );
    if (!checkTestIdsIncludeSubtype) {
      throw new NotFoundException(ResponseMessage.Test.TEST_NOT_FOUND);
    }

    const references: Reference[] = testIds.map((testId) => {
      const test: Test = subtype.tests.find((x) => x._id.toString() == testId);
      return {
        testId: testId,
        testName: test.testName,
      } as Reference;
    });

    for (let index = 0; index < subtype.tests.length; index++) {
      if (testIds.includes(subtype.tests[index]._id.toString())) {
        subtype.tests[index].references = references;
      }
    }
    await this.subtypeRespository.createOrUpdate(subtype, {
      _id: subtype._id.toString(),
    });
  }

  async deleteReference(subtypeId: string, testIds: string[]): Promise<void> {
    const pureTestIds: string[] = removeDuplicatedElement(testIds);
    if (!pureTestIds.length) {
      return;
    }

    const subtype: Subtype = await this.subtypeRespository.getOne(
      {
        _id: subtypeId,
      },
      {
        _id: 1,
        tests: 1,
      },
    );
    if (!subtype) {
      throw new NotFoundException(ResponseMessage.Test.SUBTYPE_NOT_FOUND);
    }

    for (let i = 0; i < subtype.tests.length; i++) {
      if (
        subtype.tests[i].references?.length &&
        subtype.tests[i].references.some((e) => pureTestIds.includes(e.testId))
      ) {
        subtype.tests[i].references = [];
      }
    }

    await this.repository.createOrUpdate(subtype, {
      _id: subtype._id.toString(),
    });
  }

  async updateTest(
    subtypeId: string,
    testId: string,
    testsDto: TestsDto,
  ): Promise<void> {
    const subtype: Subtype = await this.subtypeRespository.getOne(
      { _id: subtypeId },
      {
        _id: 1,
        tests: 1,
        testType: 1,
      },
    );
    if (!subtype) {
      throw new NotFoundException(ResponseMessage.Test.SUBTYPE_NOT_FOUND);
    }

    const test: Test = subtype.tests.find((e) => e._id.toString() == testId);
    if (!test) {
      throw new NotFoundException(ResponseMessage.Test.TEST_NOT_FOUND);
    }

    await this.validateExistedTestName(
      subtypeId,
      testsDto.nameOfTest,
      test._id.toString(),
    );

    test.subtypeId = testsDto.subtypeId;
    test.testName = testsDto.nameOfTest;
    test.logoType = testsDto.typeOfLogo;
    test.media = testsDto.media.map((media) => {
      const mediaDto: MediaDto = new MediaUtil().processThumbnailVideo(media);
      return new MediaSource({
        source: mediaDto.source,
        thumbnail: mediaDto.thumbnail,
        type: mediaDto.type,
        uniqueKey: mediaDto.uniqueKey,
        url: mediaDto.url,
      });
    });
    test.description = testsDto.description;
    test.tableDescription = testsDto.tableDescription;
    test.table = testsDto.table;
    test.title = testsDto.title;
    test.placeholder = testsDto.placeholder;
    test.metric = testsDto.metric;
    test.updatedAt = this.dateUtil.getNowTimeInMilisecond();

    test.numberOfPeople = testsDto.generalInfo.kindOfExercise.numberOfPeople;
    test.place = testsDto.generalInfo.kindOfExercise.place;
    test.time = testsDto.generalInfo.timeExercise.time;
    test.period = testsDto.generalInfo.timeExercise.period;
    test.sequence = await this.getTestSequence(
      testsDto.nameOfTest,
      subtype.testType,
    );

    await this.repository.updateOneTest(subtypeId, testId, test);
  }

  async getTestSequence(
    testName: string,
    testType: TestType,
  ): Promise<Sequence> {
    const id = `${testType}_MALE`;
    const formatedTestName: string = normalizeTextFormula(testName);
    const docs = await db.collection('caches').doc(id).get();
    if (!Object.keys(docs.data()).includes(formatedTestName)) {
      throw new NotFoundException(ResponseMessage.Test.TEST_NOT_FOUND);
    }

    const data: string[] = docs.data()[`${formatedTestName}`];
    return Array.from(data[2])[0] === '>'
      ? Sequence.DECREASING
      : Sequence.INCREASING;
  }

  async getTestById(subtypeId: string, testId: string): Promise<TestResponse> {
    await Promise.all([
      this.subtypeService.validateNotFoundSubtype(subtypeId),
      this.validateNotFoundTest(subtypeId, testId),
    ]);
    const test: Test = await this.repository.getOneTest(subtypeId, testId);

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
  }

  async getListTestNameFromExcel(tab: TestType): Promise<string[]> {
    const id: string = `${tab}_MALE`;
    const doc = await db.collection('caches').doc(id).get();
    const listTestName: string[] = doc.data()
      ? Object.values(doc.data())
          .map((e) => e[0])
          .filter((e) => e !== 'Test Index')
      : [];
    return listTestName;
  }

  async deleteTest(subtypeId: string, testId: string): Promise<void> {
    const subtype: Subtype = await this.repository.getOne(
      {
        _id: subtypeId,
      },
      {
        tests: 1,
        deletedTests: 1,
      },
    );
    if (!subtype) {
      throw new NotFoundException(ResponseMessage.Test.SUBTYPE_NOT_FOUND);
    }

    const deletedIndex: number = subtype.tests.findIndex(
      (e) => e._id.toString() == testId,
    );
    if (deletedIndex != -1) {
      const deletedTest: Test = subtype.tests.splice(deletedIndex, 1)[0];

      subtype.deletedTests = [...subtype.deletedTests, deletedTest];
      await this.repository.createOrUpdate(subtype, { _id: subtypeId });
    }
  }

  async validateExistedTestName(
    subtypeId: string,
    testName: string,
    testId?: string,
  ): Promise<void> {
    const subtype: Subtype = await this.repository.getOne({
      _id: subtypeId,
    });
    const tests: Test[] = subtype.tests;
    if (testId) {
      const numberDuplicate: number = tests.filter(
        (e) => e.testName == testName && e._id.toString() != testId,
      ).length;
      if (numberDuplicate) {
        throw new BadRequestException(ResponseMessage.Test.EXISTED_TEST_NAME);
      }
    } else {
      const numberDuplicate: number = tests.filter(
        (e) => e.testName == testName,
      ).length;
      if (numberDuplicate) {
        throw new BadRequestException(ResponseMessage.Test.EXISTED_TEST_NAME);
      }
    }
  }
}

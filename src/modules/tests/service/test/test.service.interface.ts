import { TestResponse } from '../../dtos/test/test.response';
import { TestsDto } from '../../dtos/test/tests.dto';
import { TestType } from '../../enums/test-type';

export interface ITestService {
  createTests(
    subtypeId: string,
    testsDto: TestsDto,
    currentUserId: string,
  ): Promise<void>;

  createReference(subtypeId: string, testIds: string[]): Promise<void>;
  deleteReference(subtypeId: string, testIds: string[]): Promise<void>;

  updateTest(
    subtypeId: string,
    testId: string,
    updateTest: TestsDto,
  ): Promise<void>;

  getTestById(subtypeId: string, testId: string): Promise<TestResponse>;
  getListTestNameFromExcel(tab: TestType): Promise<string[]>;

  deleteTest(subtypeId: string, testId: string): Promise<void>;

  duplicateTest(
    subtypeId: string,
    testId: string,
    currentUserId: string,
  ): Promise<void>;

  validateExistedTestName(
    subtypeId: string,
    testName: string,
    testId?: string,
  ): Promise<void>;
  validateNotFoundTest(subtypeId: string, testId: string): Promise<void>;
}

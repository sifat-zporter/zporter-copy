import { TestLevel } from '../../tests/enums/test-level';

export class CreateTestsGroupDto {
  readonly teamIds: string[];
  readonly groupIds: string[];
  readonly date: Date;
  readonly location: string;
  readonly level: TestLevel;
  readonly tests: string[];
}

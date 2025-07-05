import { FilterQuery } from 'typeorm';
import { PipelineDto } from '../../../abstract/dto/pipeline.dto';
import { ICommonRepository } from '../../../abstract/interface/common-repository.interface';
import { Test } from '../test/test';
import { Subtype } from './subtype';

export interface ISubtypeRepository extends ICommonRepository<Subtype> {
  addNewTest(subtypeId: string, test: Test): Promise<void>;

  getOneTest(subtypeId: string, testId: string): Promise<Test>;
  getOneTestv2(testId: string, isDeleted?: boolean): Promise<Test>;

  updateOneTest(subtypeId: string, testId: string, test: Test): Promise<void>;

  getTestsBySubtypeName(subtypeName: string): Promise<Test>;

  // deleteOneTest(subtypeId: string, testId: string): Promise<void>;
}

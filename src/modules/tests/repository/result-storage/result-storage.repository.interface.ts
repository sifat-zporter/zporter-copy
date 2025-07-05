import { ICommonRepository } from '../../../abstract/interface/common-repository.interface';
import { INewCommonRepository } from '../../../abstract/interface/new-common-repository.interface';
import { ResultStorage } from './result-storage';

export interface IResultStorageRepository
  extends INewCommonRepository<ResultStorage> {
  //  extends ICommonRepository<ResultStorage>
}

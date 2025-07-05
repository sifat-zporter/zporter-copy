import { ICommonRepository } from '../../abstract/interface/common-repository.interface';
import { INewCommonRepository } from '../../abstract/interface/new-common-repository.interface';
import { ILibEntity } from './entity.interface';

export interface ILibRepository extends INewCommonRepository<ILibEntity> {
  // get getSourceRepository(): INewCommonRepository<ILibEntity>;
  sourceRepository: INewCommonRepository<ILibEntity>;
}

import { INewCommonRepository } from '../../abstract/interface/new-common-repository.interface';
import { LibraryType } from '../enum/library.type';
import { ILibEntity } from '../interface/entity.interface';
import { ILibRepository } from '../interface/repository.interface';

export interface ILibFactoryRepository {
  getSourceRepository(type: LibraryType): INewCommonRepository<ILibEntity>;
  getLibRepository(type: LibraryType): ILibRepository;
}

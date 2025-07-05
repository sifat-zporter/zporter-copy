import { LibraryType } from '../enum/library.type';

export interface ILibFactoryService {
  getLibService(type: LibraryType);
}

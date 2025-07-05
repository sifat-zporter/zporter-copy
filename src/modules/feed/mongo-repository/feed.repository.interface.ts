import { ICommonRepository } from '../../abstract/interface/common-repository.interface';
import { Post } from './post';

export interface IFeedRepository extends ICommonRepository<Post> {}

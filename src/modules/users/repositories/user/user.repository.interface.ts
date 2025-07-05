import { ICommonRepository } from '../../../abstract/interface/common-repository.interface';
import { User } from './user';

export interface IUserRepository extends ICommonRepository<User> {}

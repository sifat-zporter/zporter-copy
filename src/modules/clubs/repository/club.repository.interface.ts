import { ICommonRepository } from '../../abstract/interface/common-repository.interface';
import { INewCommonRepository } from '../../abstract/interface/new-common-repository.interface';
import { Club } from './club';

export interface IClubRepository extends INewCommonRepository<Club> {}

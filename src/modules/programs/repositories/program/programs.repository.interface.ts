import { FilterQuery } from 'mongoose';
import { INewCommonRepository } from '../../../abstract/interface/new-common-repository.interface';
import { Program } from './program';
import { ProgramsRequestDto } from '../../dtos/program/programs-request.dto';

export interface IProgramsRepository extends INewCommonRepository<Program> {
  deleteHardUsingBulkWrite(
    filterQuery: FilterQuery<Program>,
    doc: Program,
  ): Promise<void>;
  createOrUpdateMany(docs: Program[], session: any): Promise<void>;

  createOrUpdateProgramWithSession(doc: Program);

  getLastVersionAndSetIsOldVersion(
    program: Program,
    programDto: ProgramsRequestDto,
  ): Promise<number>;
}

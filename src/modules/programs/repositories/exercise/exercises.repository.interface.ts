import { FilterQuery, ClientSession } from 'mongoose';
import { ICommonRepository } from '../../../abstract/interface/common-repository.interface';
import { Exercise } from './exercise';

export interface IExercisesRepository extends ICommonRepository<Exercise> {
  deleteHardUsingBulkWrite(
    filterQuery: FilterQuery<Exercise>,
    doc: Exercise,
  ): Promise<void>;

  createOrUpdateMany(docs: Exercise[]): Promise<void>;

  updateWithSession(
    filterQuery: FilterQuery<Exercise>,
    updatedDocument: Partial<Exercise>,
    session?: ClientSession,
  ): Promise<void>;
}

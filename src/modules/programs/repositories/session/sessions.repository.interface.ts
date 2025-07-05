import { Session } from './session';
import { FilterQuery, ClientSession } from 'mongoose';
import { ICommonRepository } from '../../../abstract/interface/common-repository.interface';

export interface ISessionRepository extends ICommonRepository<Session> {
  deleteHardUsingBulkWrite(
    filterQuery: FilterQuery<Session>,
    doc: Session,
  ): Promise<void>;

  createOrUpdateMany(docs: Session[]): Promise<void>;

  updateWithSession(
    filterQuery: FilterQuery<Session>,
    updatedDocument: Partial<Session>,
    session?: ClientSession,
  ): Promise<void>;
}

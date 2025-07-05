import { FilterQuery, ClientSession } from 'mongoose';
import { PipelineDto } from '../dto/pipeline.dto';
import { INewCommonRepository } from './new-common-repository.interface';

export interface ICommonRepository<T> extends INewCommonRepository<T> {
  createOrUpdate(doc: T, filterQuery?: FilterQuery<T>): Promise<T>;
  deleteHard(filterQuery: FilterQuery<T>): Promise<void>;
  get(pipelineDto: PipelineDto<T>): Promise<T[]>;
  getOne(
    entityFilterQuery: FilterQuery<T>,
    projection?: any | null,
  ): Promise<T | null>;

  count(entityFilterQuery: FilterQuery<T>): Promise<number>;
}

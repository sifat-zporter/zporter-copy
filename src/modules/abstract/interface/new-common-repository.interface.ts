import { FilterQuery } from 'typeorm';
import { PipelineDto } from '../dto/pipeline.dto';

export interface INewCommonRepository<T> {
  /**
   * Create or update documents
   * @param doc document
   * @param filterQuery condition for filtering
   * @param session for transaction
   */
  createOrUpdate(
    doc: T,
    filterQuery: FilterQuery<T>,
    session?: any,
  ): Promise<T>;
  createOrUpdateMany(docs: T[], session?: any): Promise<void>;

  deleteHard(filterQuery: FilterQuery<T>): Promise<void>;
  customedFind(pipelineDto: PipelineDto<T>): Promise<T[]>;
  customedFindOne(
    entityFilterQuery: FilterQuery<T>,
    projection?: any | null,
  ): Promise<T | null>;

  count(entityFilterQuery: FilterQuery<T>): Promise<number>;
  aggregate(entityFilterQuery: any[]);
  get(pipelineDto: PipelineDto<T>): Promise<T[]>;
}

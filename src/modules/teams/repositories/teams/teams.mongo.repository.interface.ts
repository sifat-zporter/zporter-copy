import { FilterQuery } from 'mongoose';
import { PipelineDto } from '../../../abstract/dto/pipeline.dto';
import { Team } from './team';

export interface ITeamsMongoRepository {
  createOrUpdate(team: Team, filterQuery?: FilterQuery<Team>): Promise<Team>;
  deleteHard(filterQuery: FilterQuery<Team>): Promise<void>;
  get(pipelineDto: PipelineDto<Team>): Promise<Team[]>;
  getOne(
    entityFilterQuery: FilterQuery<Team>,
    projection?: any | null,
  ): Promise<Team | null>;

  addUserIdToBlackList(userId: string, teamId: string): Promise<void>;
  removeUserIdFromBlackList(userId: string, teamId: string): Promise<void>;
}

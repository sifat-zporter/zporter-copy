import { JoinTeamStatus, MemberType } from '../../dto/teams.req.dto';
import { UsersTeam } from './users-team';
import { FilterQuery } from 'mongoose';
import { PipelineDto } from '../../../abstract/dto/pipeline.dto';
export interface IUsersTeamsMongoRepository {
  createOrUpdate(
    team: UsersTeam,
    filterQuery?: FilterQuery<UsersTeam>,
  ): Promise<UsersTeam>;
  deleteHard(filterQuery: FilterQuery<UsersTeam>): Promise<void>;
  get(pipelineDto: PipelineDto<UsersTeam>): Promise<UsersTeam[]>;
  getOne(
    entityFilterQuery: FilterQuery<UsersTeam>,
    projection?: any | null,
  ): Promise<UsersTeam | null>;

  /**
   * Create many users_teams document in database.
   * @param teamId teamId want to be joined.
   * @param userIds Array of userId that want to request for joining in teams.
   * @param type `MemberType`
   */
  createMany(
    teamId: string,
    userIds: Array<string>,
    type: MemberType,
    status: JoinTeamStatus,
  ): Promise<void>;
  updateMany<T extends { userId: string; isChanged: number }>(
    teamId,
    userIds: string[],
    status: JoinTeamStatus,
  ): Promise<Array<T>>;
}

import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { USERS_TEAMS } from '../../schemas/users-teams.schema';
import { UsersTeam } from './users-team';
import { Model } from 'mongoose';
import { IUsersTeamsMongoRepository } from './users-teams.mongo.repository.interface';
import { JoinTeamStatus, MemberType } from '../../dto/teams.req.dto';
import * as moment from 'moment';
import { UsersTeamsUtils } from '../../utils/users-teams.utils';
import { UsersMongoRepository } from '../../../users/repositories/users.mongo.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { TeamsMongoRepository } from '../teams/teams.mongo.repository';
import { PipelineDto } from '../../../abstract/dto/pipeline.dto';
import { FilterQuery } from 'mongoose';
@Injectable()
export class UsersTeamsMongoRepository
  extends AbstractMongoRepository<UsersTeam>
  implements IUsersTeamsMongoRepository
{
  constructor(
    @InjectModel(USERS_TEAMS)
    private readonly usersTeamsModel: Model<UsersTeam>,
    private readonly usersTeamsUtils: UsersTeamsUtils,
    // @InjectRepository(UsersMongoRepository)
    private usersMongoRepository: UsersMongoRepository,
    @Inject(forwardRef(() => TeamsMongoRepository))
    private readonly teamsMongoRepository: TeamsMongoRepository,
  ) {
    super(usersTeamsModel);
  }

  async createMany(
    teamId: string,
    userIds: string[],
    type: MemberType,
    status: JoinTeamStatus,
  ): Promise<void> {
    const session = await this.usersTeamsModel.startSession();
    try {
      await session.withTransaction(async () => {
        let joinTeams: Array<UsersTeam>;

        joinTeams = this.usersTeamsUtils.generateUsersTeams(userIds, {
          memberType: type,
          status,
          teamId,
        });

        return this.usersTeamsModel.create(joinTeams, { session });
      });

      await session.endSession();
    } catch (error) {
      console.log(`Error: ${error}`);
    }
  }
  async updateMany<T extends { userId: string; isChanged: number }>(
    teamId,
    userIds: string[],
    status: JoinTeamStatus,
  ): Promise<Array<T>> {
    const session = await this.usersTeamsModel.startSession();

    //# WARNING: do not change "updatedAt" in db.
    try {
      let results;
      await session.withTransaction(async () => {
        results = await Promise.all(
          userIds.map(async (userId) => {
            const updateResult = await this.usersTeamsModel.updateOne(
              { teamId, userId },
              { status },
              { session },
            );
            return { userId, isChanged: +updateResult.modifiedCount };
          }),
        );
      });
      await session.commitTransaction();
      return results;
    } catch (error) {
      await session.endSession();
      throw error;
    }
  }

  async get(pipelineDto: PipelineDto<UsersTeam>): Promise<UsersTeam[]> {
    try {
      const pipeline = this.generatePipelineAggregate(pipelineDto);

      return await this.entityModel.aggregate(
        this.generateAggregateArray(pipeline),
      );
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async getOne(
    entityFilterQuery: FilterQuery<UsersTeam>,
    projection?: any | null,
  ): Promise<UsersTeam | null> {
    this.validateObjectId(entityFilterQuery);
    try {
      const doc = await this.entityModel.findOne(entityFilterQuery, projection);
      return doc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async createOrUpdate(
    doc: UsersTeam,
    filterQuery?: FilterQuery<UsersTeam>,
  ): Promise<UsersTeam> {
    try {
      const newFilterQuery: FilterQuery<UsersTeam> = filterQuery
        ? { ...filterQuery, isDeleted: false }
        : { ...doc, isDeleted: false };
      const now = +moment.utc().format('x');
      const newDoc: UsersTeam = await this.entityModel.findOneAndUpdate(
        newFilterQuery,
        { doc, updatedAt: now },
        {
          upsert: true,
          new: true,
        },
      );
      return newDoc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async deleteHard(filterQuery: FilterQuery<UsersTeam>): Promise<void> {
    await this.entityModel.deleteMany(filterQuery);
  }
}

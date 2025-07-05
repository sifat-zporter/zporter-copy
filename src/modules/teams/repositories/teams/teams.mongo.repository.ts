import { BadRequestException, Injectable } from '@nestjs/common';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { Team } from './team';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { TeamsRequestDto } from '../../dto/teams.request.dto';
import { TEAMS_MODEL } from '../../schemas/team.schema';
import { UsersTeamsMongoRepository } from '../users-teams/users-teams.mongo.repository';
import { IUsersTeamsMongoRepository } from '../users-teams/users-teams.mongo.repository.interface';
import { ITeamsMongoRepository } from './teams.mongo.repository.interface';
import { FilterQuery } from 'mongoose';
import * as moment from 'moment';
import { PipelineDto } from '../../../abstract/dto/pipeline.dto';
@Injectable()
export class TeamsMongoRepository
  extends AbstractMongoRepository<Team>
  implements ITeamsMongoRepository
{
  constructor(
    // private readonly usersTeamsMongoReopsitory: IUsersTeamsMongoRepository,
    @InjectModel(TEAMS_MODEL)
    private readonly teamsModel: Model<Team>,
  ) {
    super(teamsModel);
    this.initIndex(
      {
        teamName: 1,
        clubId: 1,
        createdBy: 1,
      },
      'index-teams-repo',
    );
  }
  async get(pipelineDto: PipelineDto<Team>): Promise<Team[]> {
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
    entityFilterQuery: FilterQuery<Team>,
    projection?: any | null,
  ): Promise<Team | null> {
    this.validateObjectId(entityFilterQuery);
    try {
      const doc = await this.entityModel.findOne(entityFilterQuery, projection);
      return doc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async createOrUpdate(
    doc: Team,
    filterQuery?: FilterQuery<Team>,
  ): Promise<Team> {
    try {
      const newFilterQuery: FilterQuery<Team> = filterQuery
        ? { ...filterQuery, isDeleted: false }
        : { ...doc, isDeleted: false };
      const now = +moment.utc().format('x');
      const newDoc: Team = await this.entityModel.findOneAndUpdate(
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

  async deleteHard(filterQuery: FilterQuery<Team>): Promise<void> {
    await this.entityModel.deleteMany(filterQuery);
  }

  async addUserIdToBlackList(userId: string, teamId: string): Promise<void> {
    await this.entityModel.updateOne(
      {
        _id: teamId,
      },
      {
        $push: {
          blackList: userId,
        },
      },
    );
  }

  // async hardDelete(filter: Object): Promise<void> {

  // }

  async removeUserIdFromBlackList(
    userId: string,
    teamId: string,
  ): Promise<void> {
    await this.entityModel.updateOne(
      {
        _id: teamId,
      },
      {
        $pull: {
          blackList: userId,
        },
      },
    );
  }
}

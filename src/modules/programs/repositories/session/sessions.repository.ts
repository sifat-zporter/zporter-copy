import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, ClientSession } from 'mongoose';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { PipelineDto } from '../../../abstract/dto/pipeline.dto';
import { PROGRAM_SESSIONS_MODEL, Session } from './session';
import { ISessionRepository } from './sessions.repository.interface';

@Injectable()
export class SessionsRepository
  extends AbstractMongoRepository<Session>
  implements ISessionRepository
{
  constructor(
    @InjectModel(PROGRAM_SESSIONS_MODEL)
    private programSessionModel: Model<Session>,
  ) {
    super(programSessionModel);
    const _1MonthSeconds = 2592000; // 1 month seconds = 2592000
    this.initTTL(
      {
        deletedAt: 1,
      },
      'TTL-index',
      _1MonthSeconds,
    );
  }

  async count(filterQuery: FilterQuery<Session>): Promise<number> {
    return await this.entityModel.count(filterQuery);
  }

  async deleteManySessions(programId: string): Promise<void> {
    try {
      await this.entityModel.deleteMany({ programId: programId });
    } catch (error) {
      throw error;
    }
  }

  async get(pipelineDto: PipelineDto<Session>): Promise<Session[]> {
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
    entityFilterQuery: FilterQuery<Session>,
    projection?: any | null,
  ): Promise<Session | null> {
    this.validateObjectId(entityFilterQuery);
    try {
      const doc = await this.entityModel.findOne(entityFilterQuery, projection);
      return doc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async createOrUpdate(
    doc: Session,
    filterQuery?: FilterQuery<Session>,
  ): Promise<Session> {
    try {
      const newFilterQuery: FilterQuery<Session> = filterQuery
        ? { ...filterQuery, isDeleted: false }
        : { _id: doc._id.toString(), isDeleted: false };

      const newDoc: Session = await this.entityModel.findOneAndUpdate(
        newFilterQuery,
        doc,
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

  async deleteHard(filterQuery: FilterQuery<Session>): Promise<void> {
    await this.entityModel.deleteMany(filterQuery);
  }

  async deleteHardUsingBulkWrite(
    filterQuery: FilterQuery<Session>,
    doc: Session,
  ): Promise<void> {
    await this.entityModel.bulkWrite([
      {
        updateMany: {
          filter: filterQuery,
          update: {
            $set: JSON.parse(JSON.stringify(doc)),
          },
        },
      },
    ]);
  }

  async createOrUpdateMany(docs: Session[]): Promise<void> {
    const operations = docs.map((e) => {
      return {
        updateOne: {
          filter: {
            _id: e._id.toString(),
          },
          update: {
            $set: JSON.parse(JSON.stringify(e)),
          },
          upsert: true,
        },
      };
    });

    await this.entityModel.bulkWrite(operations, {
      ordered: false,
    });
  }
}

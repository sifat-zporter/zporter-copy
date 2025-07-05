import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { FilterQuery } from 'typeorm';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { PipelineDto } from '../../../abstract/dto/pipeline.dto';
import { INewCommonRepository } from '../../../abstract/interface/new-common-repository.interface';
import { PROGRAMS_MODEL, Program } from './program';
import { IProgramsRepository } from './programs.repository.interface';
import { ProgramsRequestDto } from '../../dtos/program/programs-request.dto';

@Injectable()
export class ProgramsRepository
  extends AbstractMongoRepository<Program>
  implements IProgramsRepository, INewCommonRepository<Program>
{
  constructor(
    @InjectModel(PROGRAMS_MODEL)
    private programModel: Model<Program>,
  ) {
    super(programModel);
    const _1MonthSeconds = 2592000; // 1 month seconds = 2592000
    this.initTTL(
      {
        deletedAt: 1,
      },
      'TTL-index',
      _1MonthSeconds,
    );
  }
  async count(entityFilterQuery: FilterQuery<Program>): Promise<number> {
    return await this.entityModel.count(entityFilterQuery);
  }

  async get(pipelineDto: PipelineDto<Program>): Promise<Program[]> {
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
    entityFilterQuery: FilterQuery<Program>,
    projection?: any | null,
  ): Promise<Program | null> {
    this.validateObjectId(entityFilterQuery);
    try {
      const doc = await this.entityModel.findOne(entityFilterQuery, projection);
      return doc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async createOrUpdate(
    doc: Program,
    filterQuery?: FilterQuery<Program>,
  ): Promise<Program> {
    try {
      const newFilterQuery: FilterQuery<Program> = filterQuery
        ? { ...filterQuery, isDeleted: false }
        : { _id: doc._id.toString(), isDeleted: false };

      const newDoc: Program = await this.entityModel.findOneAndUpdate(
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

  async deleteHard(filterQuery: FilterQuery<Program>): Promise<void> {
    await this.entityModel.deleteMany(filterQuery);
  }

  async deleteHardUsingBulkWrite(
    filterQuery: FilterQuery<Program>,
    doc: Program,
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

  async createOrUpdateMany(docs: Program[], session: any): Promise<void> {
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
      session,
    });
  }

  async createOrUpdateProgramWithSession(doc: Program) {
    return this.entityModel.findOneAndUpdate(
      {
        _id: doc._id.toString(),
      },
      {
        ...doc,
      },
      {
        upsert: true,
        new: true,
      },
    );
  }

  async getLastVersionAndSetIsOldVersion(
    program: Program,
    programDto: ProgramsRequestDto,
  ): Promise<number> {
    const libProgramId = program?.libProgramId || programDto.libProgramId;

    if (libProgramId) {
      const [totalVersion] = await Promise.all([
        this.entityModel.count({
          libProgramId: libProgramId,
        }),
        this.entityModel.updateMany(
          {
            libProgramId: libProgramId,
          },
          {
            $set: {
              isOldVersion: true,
            },
          },
        ),
      ]);

      return totalVersion;
    }

    if (program?.parentProgramId) {
      const [totalVersion] = await Promise.all([
        this.entityModel.count({
          parentProgramId: program.parentProgramId,
        }),
        this.entityModel.updateMany(
          {
            parentProgramId: program.parentProgramId,
          },
          {
            $set: {
              isOldVersion: true,
            },
          },
        ),
      ]);

      return totalVersion + 1;
    }

    if (program?._id) {
      await this.entityModel.updateOne(
        {
          _id: program._id,
        },
        {
          $set: {
            isOldVersion: true,
          },
        },
      );
    }

    return 1;
  }

  async getProgramDetailById(id: string) {
    const query: PipelineStage[] = [
      {
        $match: {
          _id: new Types.ObjectId(id),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'program_sessions',
          let: {
            programId: '$_id',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$programId', '$$programId'],
                },
                isDeleted: false,
              },
            },
            {
              $lookup: {
                from: 'program_exercises',
                let: {
                  sessionId: '$_id',
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$sessionId', '$$sessionId'],
                      },
                      isDeleted: false,
                    },
                  },
                ],
                as: 'exercises',
              },
            },
          ],
          as: 'sessions',
        },
      },
    ];

    const result = await this.programModel.aggregate(query);
    if (!result.length) {
      return;
    }

    return result[0];
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { PipelineDto } from '../../../abstract/dto/pipeline.dto';
import { Exercise, PROGRAM_EXERCISES_MODEL } from './exercise';
import { IExercisesRepository } from './exercises.repository.interface';

@Injectable()
export class ExercisesRepository
  extends AbstractMongoRepository<Exercise>
  implements IExercisesRepository
{
  constructor(
    @InjectModel(PROGRAM_EXERCISES_MODEL)
    private programExerciseModel: Model<Exercise>,
  ) {
    super(programExerciseModel);
    const _1MonthSeconds = 2592000; // 1 month seconds = 2592000
    this.initTTL(
      {
        deletedAt: 1,
      },
      'TTL-index',
      _1MonthSeconds,
    );
  }

  async createOrUpdateMany(docs: Exercise[]): Promise<void> {
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

  async count(entityFilterQuery: FilterQuery<Exercise>): Promise<number> {
    return await this.programExerciseModel.count(entityFilterQuery);
  }

  async deleteExercisesBySessionId(programSessionId: string): Promise<void> {
    try {
      await this.programExerciseModel.deleteMany({
        programSessionId: programSessionId,
      });
    } catch (error) {
      throw error;
    }
  }

  async get(pipelineDto: PipelineDto<Exercise | any>): Promise<Exercise[]> {
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
    entityFilterQuery: FilterQuery<Exercise>,
    projection?: any | null,
  ): Promise<Exercise | null> {
    this.validateObjectId(entityFilterQuery);
    try {
      const doc = await this.entityModel.findOne(entityFilterQuery, projection);
      return doc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async createOrUpdate(
    doc: Exercise,
    filterQuery?: FilterQuery<Exercise>,
  ): Promise<Exercise> {
    try {
      const newFilterQuery: FilterQuery<Exercise> = filterQuery
        ? { ...filterQuery, isDeleted: false }
        : { _id: doc._id.toString(), isDeleted: false };

      const newDoc: Exercise = await this.entityModel.findOneAndUpdate(
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

  async deleteHard(filterQuery: FilterQuery<Exercise>): Promise<void> {
    await this.entityModel.deleteMany(filterQuery);
  }

  async deleteHardUsingBulkWrite(
    filterQuery: FilterQuery<Exercise>,
    doc: Exercise,
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
}

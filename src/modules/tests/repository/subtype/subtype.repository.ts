import { BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Model } from 'mongoose';
import { FilterQuery } from 'typeorm';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { PipelineDto } from '../../../abstract/dto/pipeline.dto';
import { Test } from '../test/test';
import { Subtype, SUBTYPE_MODEL } from './subtype';
import { ISubtypeRepository } from './subtype.repository.interface';

export class SubtypeRepository
  extends AbstractMongoRepository<Subtype>
  implements ISubtypeRepository {
  constructor(
    @InjectModel(SUBTYPE_MODEL)
    private readonly subtypeModel: Model<Subtype>,
  ) {
    super(subtypeModel);
  }
  async updateOneTest(
    subtypeId: string,
    testId: string,
    test: Test,
  ): Promise<void> {
    await this.entityModel.updateOne(
      {
        _id: subtypeId,
        tests: {
          $elemMatch: {
            _id: new mongoose.Types.ObjectId(testId),
          },
        },
      },
      {
        $set: {
          'tests.$': test,
        },
      },
    );
  }

  // async deleteOneTest(subtypeId: string, testId: string): Promise<void> {
  //   await this.entityModel.updateOne(
  //     {
  //       _id: subtypeId,
  //       tests: {
  //         $elemMatch: {
  //           _id: new mongoose.Types.ObjectId(testId),
  //         },
  //       },
  //     },
  //     {
  //       $set: {
  //         'tests.$.isDeleted': true,
  //       },
  //     },
  //   );
  // }

  async getOneTest(
    subtypeId: string,
    testId: string,
    // isDeleted: boolean,
  ): Promise<Test> {
    const result: any[] = await this.entityModel.aggregate([
      {
        $unwind: { path: '$tests' },
      },
      {
        $match: {
          _id: new mongoose.Types.ObjectId(subtypeId),
          'tests._id': new mongoose.Types.ObjectId(testId),
          // 'tests.isDeleted': false,
        },
      },
      { $project: { _id: 0, tests: 1 } },
    ]);

    return result.length ? (result[0].tests as Test) : null;
  }

  async getOneTestv2(testId: string, isDeleted?: boolean): Promise<Test> {
    const result: any[] = await this.entityModel.aggregate([
      {
        $unwind: { path: '$tests' },
      },
      {
        $match: isDeleted
          ? {
            'tests._id': new mongoose.Types.ObjectId(testId),
            'tests.isDeleted': isDeleted,
          }
          : {
            'tests._id': new mongoose.Types.ObjectId(testId),
          },
      },
      { $project: { _id: 0, tests: 1 } },
    ]);

    return result.length ? (result[0].tests as Test) : null;
  }

  async addNewTest(subtypeId: string, test: Test): Promise<void> {
    await this.entityModel.updateOne(
      { _id: subtypeId },
      { $push: { tests: test } },
      { new: true },
    );
  }

  async createOrUpdate(
    doc: Subtype,
    filterQuery?: FilterQuery<Subtype>,
  ): Promise<Subtype> {
    try {
      const newFilterQuery: FilterQuery<Subtype> = filterQuery
        ? {
          ...filterQuery,
          // isDeleted: false
        }
        : {
          ...doc,
          // isDeleted: false
        };

      const newDoc: Subtype = await this.entityModel.findOneAndUpdate(
        newFilterQuery,
        {
          ...doc,
          // updatedAt: this.dateUtil.getNowTimeInMilisecond(),
        },
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

  async deleteHard(filterQuery: FilterQuery<Subtype>): Promise<void> {
    await this.entityModel.deleteMany(filterQuery);
  }

  async get(pipelineDto: PipelineDto<Subtype>): Promise<Subtype[]> {
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
    entityFilterQuery: FilterQuery<Subtype>,
    projection?: any,
  ): Promise<Subtype> {
    this.validateObjectId(entityFilterQuery);
    try {
      const doc = await this.entityModel.findOne(entityFilterQuery, projection);
      return doc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async count(entityFilterQuery: FilterQuery<Subtype>): Promise<number> {
    return await this.entityModel.count(entityFilterQuery);
  }

  async getTestsBySubtypeName(subtypeName: string): Promise<Test> {
    const result: any[] = await this.entityModel.aggregate([
      {
        $match: {
          'tests.testName': subtypeName,
          isDeleted: false,
        },
      },
      {
        $unwind: { path: '$tests' },
      },
      { $project: { _id: 0, tests: 1 } },
    ]);

    return result.length ? result.find(item => item.tests.testName === subtypeName)?.tests : null;
  }
}

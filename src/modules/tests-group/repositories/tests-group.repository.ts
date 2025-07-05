import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FilterQuery } from 'typeorm';
import { TESTS_GROUP_MODEL, TestsGroup } from '../entities/tests-group.entity';
import { ICommonRepository } from '../../abstract/interface/common-repository.interface';
import { PipelineDto } from '../../abstract/dto/pipeline.dto';
import { AbstractMongoRepository } from '../../abstract/abstract-mongo.repository';

@Injectable()
export class TestsGroupRepository
  extends AbstractMongoRepository<TestsGroup>
  implements ICommonRepository<TestsGroup>
{
  constructor(
    @InjectModel(TESTS_GROUP_MODEL)
    private testsGroupModel: Model<TestsGroup>,
  ) {
    super(testsGroupModel);
  }

  async createOrUpdate(
    doc: TestsGroup,
    filterQuery?: FilterQuery<TestsGroup>,
  ): Promise<TestsGroup> {
    try {
      const newFilterQuery: FilterQuery<TestsGroup> = filterQuery || {
        _id: doc._id,
      };

      const newDoc: TestsGroup = await this.entityModel.findOneAndUpdate(
        newFilterQuery,
        {
          $set: doc,
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

  async get(pipelineDto: PipelineDto<TestsGroup>): Promise<TestsGroup[]> {
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
    entityFilterQuery: FilterQuery<TestsGroup>,
    projection?: any,
  ): Promise<TestsGroup> {
    this.validateObjectId(entityFilterQuery);
    try {
      const doc = await this.entityModel.findOne(entityFilterQuery, projection);
      return doc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async count(entityFilterQuery: FilterQuery<TestsGroup>): Promise<number> {
    return await this.entityModel.count(entityFilterQuery);
  }
}

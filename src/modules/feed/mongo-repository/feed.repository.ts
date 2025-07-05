import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery } from 'typeorm';
import { AbstractMongoRepository } from '../../abstract/abstract-mongo.repository';
import { PipelineDto } from '../../abstract/dto/pipeline.dto';
import { IFeedRepository } from './feed.repository.interface';
import { Post } from './post';
import { Model } from 'mongoose';
import { FEED_MODEL } from '../schemas/feed.schemas';

@Injectable()
export class FeedRepository
  extends AbstractMongoRepository<Post>
  implements IFeedRepository
{
  constructor(
    @InjectModel(FEED_MODEL)
    private postModel: Model<Post>,
  ) {
    super(postModel);
  }
  async get(pipelineDto: PipelineDto<Post>): Promise<Post[]> {
    try {
      const pipeline = this.generatePipelineAggregate(pipelineDto);

      return await this.entityModel.aggregate(
        this.generateAggregateArray(pipeline),
      );
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  //# TODO: these function will be completed later
  createOrUpdate(doc: Post, filterQuery?: FilterQuery<Post>): Promise<Post> {
    throw new Error('Method not implemented.');
  }
  deleteHard(filterQuery: FilterQuery<Post>): Promise<void> {
    throw new Error('Method not implemented.');
  }
  getOne(
    entityFilterQuery: FilterQuery<Post>,
    projection?: any,
  ): Promise<Post> {
    throw new Error('Method not implemented.');
  }
  count(entityFilterQuery: FilterQuery<Post>): Promise<number> {
    throw new Error('Method not implemented.');
  }
}

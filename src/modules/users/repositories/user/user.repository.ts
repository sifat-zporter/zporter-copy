import { BadRequestException, Injectable } from '@nestjs/common';
import { FilterQuery } from 'typeorm';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { AbstractController } from '../../../abstract/abstract.controller';
import { PipelineDto } from '../../../abstract/dto/pipeline.dto';
import { USER_MODEL } from '../../schemas/user.schema';
import { User } from './user';
import { IUserRepository } from './user.repository.interface';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class UserRepository
  extends AbstractMongoRepository<User>
  implements IUserRepository
{
  constructor(
    @InjectModel(USER_MODEL)
    private testsModel: Model<User>,
  ) {
    super(testsModel);
  }
  createOrUpdate(doc: User, filterQuery?: FilterQuery<User>): Promise<User> {
    throw new Error('Method not implemented.');
  }
  deleteHard(filterQuery: FilterQuery<User>): Promise<void> {
    throw new Error('Method not implemented.');
  }
  get(pipelineDto: PipelineDto<User>): Promise<User[]> {
    throw new Error('Method not implemented.');
  }
  async getOne(
    entityFilterQuery: FilterQuery<User>,
    projection?: any,
  ): Promise<User> {
    this.validateObjectId(entityFilterQuery);
    try {
      const doc: User = await this.entityModel.findOne(
        entityFilterQuery,
        projection,
      );
      return doc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  count(entityFilterQuery: FilterQuery<User>): Promise<number> {
    throw new Error('Method not implemented.');
  }
}

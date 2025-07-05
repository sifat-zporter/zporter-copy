import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AbstractMongoRepository } from '../../abstract/abstract-mongo.repository';
import { UserForMongo } from '../entities/user.entity';
import { USER_MODEL } from '../schemas/user.schema';
import { IUsersMongoRepository } from './users.monog.repository.interface';
import { Model } from 'mongoose';

@Injectable()
export class UsersMongoRepository
  extends AbstractMongoRepository<UserForMongo>
  implements IUsersMongoRepository
{
  constructor(
    @InjectModel(USER_MODEL)
    private readonly userModel: Model<UserForMongo>,
  ) {
    super(userModel);
  }
}

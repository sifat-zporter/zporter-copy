import { InjectModel } from '@nestjs/mongoose';
import { AbstractMongoRepository } from '../../abstract/abstract-mongo.repository';
import { FOLLOW_MODEL, IFollow } from '../schemas/friend.schemas';
import { Model } from 'mongoose';

export class FollowsMongoRepository extends AbstractMongoRepository<IFollow> {
  constructor(
    @InjectModel(FOLLOW_MODEL)
    private readonly followModel: Model<IFollow>,
  ) {
    super(followModel);
  }
}

import { InjectModel } from '@nestjs/mongoose';
import { AbstractMongoRepository } from '../../abstract/abstract-mongo.repository';
import { FRIEND_MODEL, IFriend } from '../schemas/friend.schemas';
import { Model } from 'mongoose';

export class FriendsMongoRepository extends AbstractMongoRepository<IFriend> {
  constructor(
    @InjectModel(FRIEND_MODEL)
    private readonly friendModel: Model<IFriend>,
  ) {
    super(friendModel);
  }
}

import { InjectModel } from '@nestjs/mongoose';
import { AbstractMongoRepository } from '../abstract/abstract-mongo.repository';
import { TAG_MODEL, Tags } from './schemas/tags.schemas';
import { Model } from 'mongoose';

export class TagsRepository extends AbstractMongoRepository<Tags> {
  constructor(
    @InjectModel(TAG_MODEL)
    private readonly tagModel: Model<Tags>,
  ) {
    super(tagModel);
    this.initIndex(
      {
        name: 1,
        type: 1,
      },
      'index-tags-repo',
    );
  }

  async getTagsByNames(names: string[]) {
    return this.tagModel.find({
      name: {
        $in: names,
      },
    });
  }

  async save(tag: Tags | Tags[]) {
    return this.tagModel.create(tag);
  }
}

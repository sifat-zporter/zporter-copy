import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DraftUser } from '../schemas/draft-user.schema';

@Injectable()
export class DraftUsersMongoRepository {
  constructor(
    @InjectModel(DraftUser.name)
    private readonly draftUserModel: Model<DraftUser>,
  ) {}

  async create(payload: any) {
    return this.draftUserModel.create(payload);
  }

  async upsert(id: string, payload: any) {
    return this.draftUserModel.findByIdAndUpdate(id, payload, {
      upsert: true,
    });
  }

  async update(id: string, payload: any) {
    return this.draftUserModel.findByIdAndUpdate(id, payload);
  }

  async find(query: any = {}, pagination: any = { limit: 10, skip: 0 }) {
    const queryFilter = {
      ...query,
      deletedAt: null,
      status: { $ne: 'confirmed' },
    };

    return this.draftUserModel
      .find(queryFilter)
      .sort({ createdAt: -1 })
      .limit(pagination.limit)
      .skip(pagination.skip);
  }

  async findById(id: string) {
    return this.draftUserModel.findById(id);
  }

  async findBySecret(secret: string) {
    return this.draftUserModel.findOne({ secret });
  }

  async delete(id: string) {
    return this.update(id, { deletedAt: new Date() });
  }
}

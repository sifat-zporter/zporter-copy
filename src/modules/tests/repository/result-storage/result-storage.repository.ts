import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { ResultStorage, RESULT_STORAGE_MODEL } from './result-storage';
import { IResultStorageRepository } from './result-storage.repository.interface';

@Injectable()
export class ResultStorageRepository
  extends AbstractMongoRepository<ResultStorage>
  implements IResultStorageRepository
{
  constructor(
    @InjectModel(RESULT_STORAGE_MODEL)
    private readonly resultStorageModel: Model<ResultStorage>,
  ) {
    super(resultStorageModel);
  }
}

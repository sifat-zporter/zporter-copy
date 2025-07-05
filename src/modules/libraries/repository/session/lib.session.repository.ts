import { Inject, Injectable } from '@nestjs/common';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { ILibRepository } from '../../interface/repository.interface';
import { SessionsRepository } from '../../../programs/repositories/session/sessions.repository';
import { ISessionRepository } from '../../../programs/repositories/session/sessions.repository.interface';
import { InjectModel } from '@nestjs/mongoose';
import { LibraryModel } from '../../enum/library.model';
import { Session } from '../../../programs/repositories/session/session';
import { Model, FilterQuery } from 'mongoose';
import { ILibEntity } from '../../interface/entity.interface';

@Injectable()
export class LibSessionRepository
  extends AbstractMongoRepository<Session>
  implements ILibRepository
{
  constructor(
    @Inject(SessionsRepository)
    public readonly sourceRepository: ISessionRepository,
    @InjectModel(LibraryModel.SESSION)
    private model: Model<Session>,
  ) {
    super(model);
    const _1MonthSeconds: number = 2592000; // 1 month seconds = 2592000
    this.initTTL(
      {
        deletedAt: 1,
      },
      'TTL-index',
      _1MonthSeconds,
    );
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { Exercise } from '../../../programs/repositories/exercise/exercise';
import { ExercisesRepository } from '../../../programs/repositories/exercise/exercises.repository';
import { IExercisesRepository } from '../../../programs/repositories/exercise/exercises.repository.interface';
import { LibraryModel } from '../../enum/library.model';
import { ILibRepository } from '../../interface/repository.interface';

@Injectable()
export class LibExerciseRepository
  extends AbstractMongoRepository<Exercise>
  implements ILibRepository
{
  constructor(
    @Inject(ExercisesRepository)
    public readonly sourceRepository: IExercisesRepository,
    @InjectModel(LibraryModel.EXERCISE)
    private model: Model<Exercise>,
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

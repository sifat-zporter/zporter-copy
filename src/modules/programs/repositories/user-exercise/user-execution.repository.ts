import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { USER_EXERCISES_MODEL, UserExecution } from './user-execution';
import { IUserExerciseRepository } from './user-execution.repository.interface';

@Injectable()
export class UserExerciseRepository
  extends AbstractMongoRepository<UserExecution>
  implements IUserExerciseRepository
{
  constructor(
    @InjectModel(USER_EXERCISES_MODEL)
    private userExercisesModel: Model<UserExecution>,
  ) {
    super(userExercisesModel);
  }
}

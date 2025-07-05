import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as mongoose from 'mongoose';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { SortBy } from '../../../../common/pagination/pagination.dto';
import { AbstractService } from '../../../abstract/abstract.service';
import { UsersService } from '../../../users/v1/users.service';
import { ExercisesRequestDto } from '../../dtos/exercise/exercises-request.dto';
import { ExerciseResponseDto } from '../../dtos/exercise/exercises-response.dto';
import { GetExercisesDto } from '../../dtos/exercise/get-exercises.dto';
import {
  Exercise,
  PROGRAM_EXERCISES_MODEL,
} from '../../repositories/exercise/exercise';
import { ExercisesRepository } from '../../repositories/exercise/exercises.repository';
import { IExercisesRepository } from '../../repositories/exercise/exercises.repository.interface';
import { IExercisesService } from './exercises.sevice.interface';
import { ExerciseSupportService } from './support/exercise.support.service';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Session } from '../../repositories/session/session';

@Injectable()
export class ExercisesService
  extends AbstractService<IExercisesRepository>
  implements IExercisesService
{
  constructor(
    @Inject(ExercisesRepository)
    private exerciseRepository: IExercisesRepository,
    private userService: UsersService,
    private supportService: ExerciseSupportService,

    @InjectModel(PROGRAM_EXERCISES_MODEL)
    private programExerciseModel: mongoose.Model<Exercise>,
  ) {
    super(exerciseRepository);
  }

  async createManyExercise(
    requests: ExercisesRequestDto[],
    sessionProgram: Session,
    isNewProgram: boolean,
  ): Promise<void> {
    // this.supportService.validateHeadline(requests);
    const newExerciesIds: string[] = [];

    for (let i = 0; i < requests?.length; i++) {
      if (requests[i]?.id) {
        newExerciesIds.push(requests[i].id.toString());
      }
    }
    const exercises: Exercise[] = this.supportService.generateExercises(
      requests,
      sessionProgram,
      isNewProgram,
    );

    // update exercises
    if (exercises.length) {
      await this.repository.createOrUpdateMany(exercises);
    }
  }

  async duplicateExercise(
    exerciseId: string,
    currentUserId: string,
  ): Promise<void> {
    const [exercise, _] = await Promise.all([
      this.repository.getOne({
        _id: exerciseId,
      }),
      this.userService.validateUserId(currentUserId),
    ]);
    if (!exercise) {
      throw new NotFoundException(ResponseMessage.Exercise.NOT_FOUND);
    }

    const newHeadline = `${exercise.headline}(copy)`;
    await this.validateHeadline(
      newHeadline,
      exercise.sessionId.toString(),
      exercise._id.toString(),
    );
    //# update exercise's information
    const nowTime: number = this.dateUtil.getNowTimeInMilisecond();

    exercise._id = new mongoose.Types.ObjectId();
    exercise.createdBy = currentUserId;
    exercise.headline = newHeadline;
    // exercise.createdAt = nowTime;
    // exercise.updatedAt = nowTime;
    exercise.isDeleted = false;

    await this.repository.createOrUpdate(exercise);
  }

  async getExerciseById(
    programExerciseId: string,
  ): Promise<ExerciseResponseDto> {
    try {
      const exerciseFound = await this.repository.getOne({
        _id: programExerciseId,
      });

      if (!exerciseFound) {
        throw new NotFoundException(ResponseMessage.Exercise.NOT_FOUND);
      }

      const result: ExerciseResponseDto =
        this.supportService.generateExerciseResponse(exerciseFound);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getExercisesBySessionId(
    getExerciseBySessionId: GetExercisesDto,
  ): Promise<ExerciseResponseDto[]> {
    try {
      const {
        sessionId,
        sorted,
        limit: pageSize,
        startAfter: page,
      } = getExerciseBySessionId;

      const sort = sorted == SortBy.ASC ? 1 : -1;
      const programExercises: Exercise[] = await this.repository.get({
        match: {
          sessionId: new Types.ObjectId(sessionId),
          isDeleted: false,
        },
        keySort: {
          createdAt: sort,
        },
        page: +page,
        pageSize: +pageSize,
      });

      const result = await Promise.all(
        programExercises.map(async (exercise) => {
          // const res: ExerciseResponseDto = {
          //   ...this.objectMapper.convertValue(
          //     exercise,
          //     new ExerciseResponseDto(),
          //   ),
          //   id: exercise._id.toString(),
          //   createdAt: +this.dateUtil.convertDateToFormat(
          //     exercise.createdAt,
          //     'x',
          //   ),
          //   updatedAt: +this.dateUtil.convertDateToFormat(
          //     exercise.updatedAt,
          //     'x',
          //   ),
          // };
          // return res;
          return this.supportService.generateExerciseResponse(exercise);
        }),
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  async validateHeadline(
    headline: string,
    sessionId: string,
    exerciseId?: string,
  ): Promise<void> {
    try {
      const numberExercise: number = exerciseId
        ? await this.repository.count({
            _id: { $ne: exerciseId },
            sessionId: sessionId,
            headline: headline,
            isDeleted: false,
          })
        : await this.repository.count({
            sessionId: sessionId,
            headline: headline,
            isDeleted: false,
          });

      if (numberExercise) {
        throw new BadRequestException(
          ResponseMessage.Program.DUPLICATED_HEADLINE,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteExercise(exerciseId: string): Promise<void> {
    const exercise: Exercise = await this.repository.customedFindOne({
      _id: exerciseId,
      isDeleted: false,
    });

    if (!exercise) {
      throw new NotFoundException(ResponseMessage.Exercise.NOT_FOUND);
    }

    const countExerciseInSession: number = await this.repository.count({
      sessionId: exercise.sessionId,
      isDeleted: false,
    });

    if (countExerciseInSession < 2) {
      throw new BadRequestException(
        ResponseMessage.Exercise.CANNOT_DELETE_EXERCISE,
      );
    }

    const deleteOption = {
      isDeleted: true,
      deletedAt: this.dateUtil.getNowDate(),
    };

    await this.repository.deleteHardUsingBulkWrite(
      {
        _id: exerciseId,
      },
      deleteOption as Exercise,
    );
  }

  async createOrUpdateExercises(
    exercises: ExercisesRequestDto[],
    currentUserId?: string,
  ): Promise<any> {
    const session = await this.programExerciseModel.startSession();
    await session.withTransaction(async () => {
      const promise = [];

      // for (const exercise of exercises) {
      //   delete exercise._id;
      // }

      const bulkWriteOperations = exercises.map((values) => {
        return {
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(values.id) },
            update: {
              $set: {
                ...values,
                ...(currentUserId && { createdBy: currentUserId }),
                ...(currentUserId && { isDeleted: false }),
                ...(currentUserId && { isPublic: true }),
              },
            },
            upsert: true,
          },
        };
      });

      promise.push(
        this.programExerciseModel.bulkWrite(bulkWriteOperations, {
          session,
          ordered: false,
        }),
      );
      return await Promise.all(promise);
    });
    await session.endSession();
    return {
      success: true,
    };
  }
}

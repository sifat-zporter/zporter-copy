import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as mongoose from 'mongoose';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { SortBy } from '../../../../common/pagination/pagination.dto';
import { AbstractService } from '../../../abstract/abstract.service';
import { UsersService } from '../../../users/v1/users.service';
import { LibExerciseSupportService } from './support/exercise.support.service';
import { ExercisesRequestDto } from '../../../programs/dtos/exercise/exercises-request.dto';
import { Exercise } from '../../../programs/repositories/exercise/exercise';
import { ExerciseResponseDto } from '../../../programs/dtos/exercise/exercises-response.dto';
import { GetExercisesDto } from '../../../programs/dtos/exercise/get-exercises.dto';
import { ILibFactoryRepository } from '../../repository/lib-factory.repository.interface';
import { ILibExercisesService } from './exercises.sevice.interface';
import { LibFactoryRepository } from '../../repository/lib-factory.repository';
import { LibraryType } from '../../enum/library.type';
import { ILibEntity } from '../../interface/entity.interface';
import { LibExerciseRepository } from '../../repository/exercise/lib.exercise.repository';
import { IExercisesRepository } from '../../../programs/repositories/exercise/exercises.repository.interface';
import { GetDetailResponse } from '../../../programs/dtos/program/programs-response.dto';
import { SessionsRequestDto } from '../../../programs/dtos/session/sessions-request.dto';

@Injectable()
export class LibExercisesService
  extends AbstractService<ILibFactoryRepository>
  implements ILibExercisesService
{
  constructor(
    @Inject(LibFactoryRepository)
    private libFactoryRepository: ILibFactoryRepository,

    @Inject(LibExerciseRepository)
    private exerciseRepository: IExercisesRepository,

    private userService: UsersService,
    private supportService: LibExerciseSupportService,
  ) {
    super(libFactoryRepository);
  }

  async createExercise(request: ExercisesRequestDto, userId: string) {
    // validate headline
    await this.validateHeadline(
      request.headline,
      request.id,
      request.sessionId,
    );

    const exercise = this.supportService.generateSingleExercise(
      request,
      userId,
    );

    await this.exerciseRepository.createOrUpdate(
      {
        ...exercise,
      },
      {
        _id: exercise._id,
      },
    );
  }

  async createManyExercise(
    sessionProgram: SessionsRequestDto,
    currentUserId: string,
  ): Promise<void> {
    const newExerciseIds: mongoose.Types.ObjectId[] = [];
    this.supportService.validateHeadline(sessionProgram.exercises);

    // Filter out exercises with existing headlines
    const filteredExercises = await this.filterExercisesWithExistingHeadlines(
      sessionProgram.exercises,
      currentUserId,
    );

    const exercises: Exercise[] = this.supportService.generateExercises(
      filteredExercises,
      currentUserId,
    );

    for (let i = 0; i < exercises.length; i++) {
      newExerciseIds.push(exercises[i]._id);
    }

    // create new exercise and remove old exercise
    await this.exerciseRepository.createOrUpdateMany(exercises);
  }

  private async filterExercisesWithExistingHeadlines(
    exercises: any[],
    currentUserId: string,
  ): Promise<any[]> {
    const filteredExercises: any[] = [];

    for (const exercise of exercises) {
      const headlineExists = await this.checkExerciseHeadlineExists(
        exercise.headline,
        currentUserId,
      );

      if (!headlineExists) {
        filteredExercises.push(exercise);
      }
    }

    return filteredExercises;
  }

  private async checkExerciseHeadlineExists(
    headline: string,
    currentUserId: string,
  ): Promise<boolean> {
    const count = await this.repository
      .getLibRepository(LibraryType.EXERCISE)
      .count({
        headline: headline,
        createdBy: currentUserId,
        isDeleted: false,
      });

    return count > 0;
  }

  async duplicateExercise(
    exerciseId: string,
    currentUserId: string,
  ): Promise<void> {
    const [exercise, _] = await Promise.all([
      this.repository.getLibRepository(LibraryType.EXERCISE).customedFindOne({
        _id: exerciseId,
      }),
      this.userService.validateUserId(currentUserId),
    ]);
    if (!exercise) {
      throw new NotFoundException(ResponseMessage.Exercise.NOT_FOUND);
    }

    const newHeadline = `${exercise.headline}(copy)`;
    await this.validateHeadline(newHeadline, exercise.sessionId, exercise._id);

    exercise._id = new mongoose.Types.ObjectId();
    exercise.createdBy = currentUserId;
    exercise.headline = newHeadline;
    exercise.isDeleted = false;

    await this.repository
      .getLibRepository(LibraryType.EXERCISE)
      .createOrUpdate(exercise, { _id: exercise._id });
  }

  async getExerciseById(
    programExerciseId: string,
  ): Promise<ExerciseResponseDto> {
    try {
      const exerciseFound: ILibEntity = await this.repository
        .getLibRepository(LibraryType.EXERCISE)
        .customedFindOne({
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
      const programExercises: ILibEntity[] = await this.repository
        .getLibRepository(LibraryType.EXERCISE)
        .customedFind({
          match: {
            sessionId: sessionId,
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
    exerciseId: mongoose.Types.ObjectId,
    sessionId: mongoose.Types.ObjectId,
  ): Promise<void> {
    if (sessionId) {
      const checkExists = await this.repository
        .getLibRepository(LibraryType.EXERCISE)
        .count({
          _id: {
            $ne: exerciseId,
          },
          sessionId: sessionId,
          headline: headline,
          isDeleted: false,
        });

      if (checkExists) {
        throw new HttpException(
          `Exercise: '${headline}' ${ResponseMessage.Program.DUPLICATED_HEADLINE}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  async deleteExercise(exerciseId: string): Promise<void> {
    const numExercises: number = await this.repository
      .getLibRepository(LibraryType.EXERCISE)
      .count({
        _id: exerciseId,
      });

    if (!numExercises) {
      throw new NotFoundException(ResponseMessage.Exercise.NOT_FOUND);
    }

    // await this.repository.createOrUpdate(numExercises, { _id: exerciseId });
    const deleteOption = {
      isDeleted: true,
      deletedAt: this.dateUtil.getNowDate(),
    };

    await this.repository
      .getLibRepository(LibraryType.EXERCISE)
      .createOrUpdate(deleteOption as Exercise, {
        _id: exerciseId,
      });
  }

  async toggleBookmarked(currentUserId: string, id: string) {
    const exercise: Exercise = await this.exerciseRepository.customedFindOne(
      {
        _id: id,
      },
      {
        _id: 1,
        bookmarkUserIds: 1,
      },
    );
    if (!exercise) {
      throw new BadRequestException(ResponseMessage.Exercise.NOT_FOUND);
    }

    const bookmarkUserIds: string[] = exercise.bookmarkUserIds;
    const isIncludesUserId: boolean = bookmarkUserIds.includes(currentUserId);

    const newBookmarkUserIds: string[] =
      isIncludesUserId === true
        ? bookmarkUserIds.filter((e) => e !== currentUserId)
        : bookmarkUserIds.concat(currentUserId);

    await this.exerciseRepository.createOrUpdate(
      { bookmarkUserIds: newBookmarkUserIds } as Exercise,
      {
        _id: exercise._id.toString(),
      },
    );
  }

  async getDetailById(
    currentUserId: string,
    id: string,
  ): Promise<GetDetailResponse> {
    return new GetDetailResponse();
  }

  async softDelete(doc: ILibEntity, docId: string): Promise<void> {
    await this.repository
      .getLibRepository(LibraryType.EXERCISE)
      .createOrUpdate(doc, { _id: docId });
  }
}

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IExecutionUtil } from './execution.util.interface';
import { Types } from 'mongoose';
import { ExecutionRequestDto } from '../../../dtos/user-exercise/request/done-exercise-request.dto';
import { Exercise } from '../../../repositories/exercise/exercise';
import { ExercisesRepository } from '../../../repositories/exercise/exercises.repository';
import { IExercisesRepository } from '../../../repositories/exercise/exercises.repository.interface';
import { TargetType } from '../../../enums/target.type';
import { AbstractService } from '../../../../abstract/abstract.service';
import { UserExerciseRepository } from '../../../repositories/user-exercise/user-execution.repository';
import { IUserExerciseRepository } from '../../../repositories/user-exercise/user-execution.repository.interface';
import { ProgressStatus } from '../../../enums/progress.status';
import { ResponseMessage } from '../../../../../common/constants/common.constant';
import { UserExecution } from '../../../repositories/user-exercise/user-execution';
import { SessionsRepository } from '../../../repositories/session/sessions.repository';
import { ISessionRepository } from '../../../repositories/session/sessions.repository.interface';
import { Session } from '../../../repositories/session/session';
import { Program } from '../../../repositories/program/program';
import { ProgramsRepository } from '../../../repositories/program/programs.repository';
import { IProgramsRepository } from '../../../repositories/program/programs.repository.interface';
import { EShareWith } from '../../../enums/share.status';
import { generatePipelineGet } from '../../../utils/generate-query.programs';
import { RunExerciseResponseDto } from '../../../dtos/user-exercise/user-exercise-response.dto';

@Injectable()
export class ExecutionUtilService
  extends AbstractService<IUserExerciseRepository>
  implements IExecutionUtil
{
  constructor(
    @Inject(ExercisesRepository)
    private exercisesRepository: IExercisesRepository,
    @Inject(SessionsRepository)
    private sessionRepository: ISessionRepository,
    @Inject(ProgramsRepository)
    private programRepository: IProgramsRepository,
    @Inject(UserExerciseRepository)
    private userExercisesRepository: IUserExerciseRepository,
  ) {
    super(userExercisesRepository);
  }

  async validateAlreadyDone(
    currentUserId: string,
    doneExerciseRequest: ExecutionRequestDto,
  ): Promise<void> {
    const isDoneExercise: number = await this.repository.count({
      userId: currentUserId,
      targetType: TargetType.EXERCISE,
      targetId: doneExerciseRequest.exerciseId,
      isDeleted: false,
    });

    if (isDoneExercise) {
      throw new BadRequestException(ResponseMessage.UserExercise.ALREADY_DONE);
    }
  }

  async validateProgress(
    sessionId: Types.ObjectId,
    request: ExecutionRequestDto,
    currentUserId: string,
  ): Promise<void> {
    const pipeline = generatePipelineGet(
      currentUserId,
      TargetType.SESSION,
      sessionId.toString(),
    );
    const exercises: Exercise[] = await this.exercisesRepository.aggregate(
      pipeline,
    );
    const indexOfExercise: number = exercises
      .map((e) => e._id.toString())
      .findIndex((e) => e == request.exerciseId);
    if (indexOfExercise > 0) {
      const isPreviousExerciseDone: number = await this.repository.count({
        targetId: exercises[indexOfExercise - 1]._id.toString(),
        targetType: TargetType.EXERCISE,
        isDeleted: false,
        status: ProgressStatus.DONE,
      });
      if (!isPreviousExerciseDone) {
        throw new BadRequestException(
          ResponseMessage.UserExercise.MUST_DONE_PREVIOUS_EXERCISE,
        );
      }
    }
  }

  async validateDoneSessionInProgram(
    currentUserId: string,
    sessionId: string,
  ): Promise<boolean> {
    const session = await this.repository.customedFindOne({
      userId: currentUserId,
      sessionId,
      isDeleted: false,
    });

    const countSessionsInProgram: number = await this.repository.count({
      sessionId: session.programId,
      isDeleted: false,
      $expr: {
        $cond: {
          if: { $eq: ['$createdBy', currentUserId] },
          then: true,
          else: { $eq: ['$shareWith', EShareWith.ALL] },
        },
      },
    });

    const countSessionDone: number = await this.repository.count({
      userId: currentUserId,
      targetType: TargetType.SESSION,
      status: ProgressStatus.DONE,
      isDeleted: false,
    });

    return countSessionsInProgram === countSessionDone;
  }

  async validateDoneExerciseInSession(
    currentUserId: string,
    exercise?: UserExecution,
  ): Promise<boolean> {
    const countExercisesInSession: number =
      await this.exercisesRepository.count({
        sessionId: exercise.sessionId,
        isDeleted: false,
        $expr: {
          $cond: {
            if: { $eq: ['$createdBy', currentUserId] },
            then: true,
            else: { $eq: ['$shareWith', EShareWith.ALL] },
          },
        },
      });

    const countExerciseDone: number = await this.repository.count({
      userId: currentUserId,
      targetType: TargetType.EXERCISE,
      status: ProgressStatus.DONE,
      isDeleted: false,
    });

    return countExercisesInSession === countExerciseDone;
  }

  async validateDone(
    programStatus: ProgressStatus,
    sesstionStatus: ProgressStatus,
    nextSessionId: string,
  ): Promise<RunExerciseResponseDto> {
    if (programStatus === ProgressStatus.DONE) {
      return new RunExerciseResponseDto({
        message: ResponseMessage.UserExercise.DONE_SESSION_EXERCISE,
        isNextSession: false,
      });
    }

    if (sesstionStatus === ProgressStatus.DONE) {
      return new RunExerciseResponseDto({
        message: 'Success',
        isNextSession: true,
        nextSessionId,
      });
    }

    return new RunExerciseResponseDto({
      message: 'Success',
      isNextSession: false,
    });
  }

  async updateProgressExercise(
    currentUserId: string,
    programId: Types.ObjectId,
    sessionsId: Types.ObjectId,
    exerciseId: Types.ObjectId,
  ): Promise<void> {
    const doneExercise: UserExecution = new UserExecution({
      _id: new Types.ObjectId(),
      parentId: sessionsId,
      targetId: exerciseId,
      targetType: TargetType.EXERCISE,
      userId: currentUserId,
      status: ProgressStatus.DONE,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,

      programId: programId,
      sessionId: sessionsId,
      exerciseId: exerciseId,
    });

    await this.repository.createOrUpdate(doneExercise, {
      _id: doneExercise._id.toString(),
    });
  }

  async updateProgressSession(
    currentUserId: string,
    sessionId: Types.ObjectId,
  ): Promise<ProgressStatus> {
    const session: Session = await this.sessionRepository.getOne({
      _id: sessionId,
    });
    let progressSession: UserExecution = await this.repository.customedFindOne({
      targetType: TargetType.SESSION,
      targetId: sessionId,
      userId: currentUserId,
    });

    if (progressSession) {
      progressSession.status = await this.getProgressStatus(progressSession);

      await this.repository.createOrUpdate(progressSession, {
        _id: progressSession._id.toString(),
      });

      return progressSession.status;
    } else {
      progressSession = new UserExecution({
        _id: new Types.ObjectId(),
        parentId: new Types.ObjectId(session.programId),
        targetId: session._id,
        targetType: TargetType.SESSION,
        userId: currentUserId,
        status: ProgressStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,

        programId: session.programId,
        sessionId: session._id,
        exerciseId: null,
      });
      progressSession.status = await this.getProgressStatus(progressSession);
      await this.repository.createOrUpdate(progressSession, {
        _id: progressSession._id.toString(),
      });
    }
    return progressSession.status;
  }

  async updateProgressProgram(
    currentUserId: string,
    programId: Types.ObjectId,
  ): Promise<ProgressStatus> {
    const program: Program = await this.programRepository.customedFindOne({
      _id: programId,
    });
    let progressProgram: UserExecution = await this.repository.customedFindOne({
      targetId: programId,
      targetType: TargetType.PROGRAM,
      userId: currentUserId,
    });

    if (progressProgram) {
      progressProgram.status = await this.getProgressStatus(progressProgram);

      await this.repository.createOrUpdate(progressProgram, {
        _id: progressProgram._id.toString(),
      });
    } else {
      progressProgram = new UserExecution({
        _id: new Types.ObjectId(),
        parentId: null,
        targetId: program._id,
        targetType: TargetType.PROGRAM,
        userId: currentUserId,
        status: ProgressStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,

        place: program.location,
        birthCountry: program.birthCountry,
        birthYear: program.birthYear,
        city: program.city,
        programCreatedBy: program.createdBy,
        role: program.role,

        programId: programId,
        sessionId: null,
        exerciseId: null,
      });
      progressProgram.status = await this.getProgressStatus(progressProgram);
      await this.repository.createOrUpdate(progressProgram, {
        _id: progressProgram._id.toString(),
      });
    }

    return progressProgram.status;
  }

  async getProgressStatus(
    userExercise: UserExecution,
  ): Promise<ProgressStatus> {
    if (userExercise.targetType == TargetType.SESSION) {
      const numExerciseInSession: number = await this.exercisesRepository.count(
        {
          sessionId: userExercise.targetId,
          isDeleted: false,
          $expr: {
            $cond: {
              if: { $eq: ['$createdBy', userExercise.userId] },
              then: true,
              else: { $eq: ['$shareWith', EShareWith.ALL] },
            },
          },
        },
      );
      const numDoneExercise: number = await this.repository.count({
        userId: userExercise.userId,
        parentId: userExercise.targetId,
        targetType: TargetType.EXERCISE,
        status: ProgressStatus.DONE,
        isDeleted: false,
      });
      return numExerciseInSession == numDoneExercise
        ? ProgressStatus.DONE
        : ProgressStatus.ACTIVE;
    }

    if (userExercise.targetType == TargetType.PROGRAM) {
      const numSessionInProgram: number = await this.sessionRepository.count({
        programId: userExercise.targetId,
        isDeleted: false,
        $expr: {
          $cond: {
            if: { $eq: ['$createdBy', userExercise.userId] },
            then: true,
            else: { $eq: ['$shareWith', EShareWith.ALL] },
          },
        },
      });
      const numDoneSession: number = await this.repository.count({
        userId: userExercise.userId,
        parentId: userExercise.targetId,
        targetType: TargetType.SESSION,
        status: ProgressStatus.DONE,
        isDeleted: false,
      });
      return numSessionInProgram <= numDoneSession
        ? ProgressStatus.DONE
        : ProgressStatus.ACTIVE;
    }
  }
}

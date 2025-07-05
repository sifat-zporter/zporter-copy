import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  GenderTypes,
  ResponseMessage,
  UserInfoDto,
} from '../../../../common/constants/common.constant';
import { mappingUserInfoById } from '../../../../helpers/mapping-user-info';
import { AbstractService } from '../../../abstract/abstract.service';
import { AgeGroup } from '../../../dashboard/dto/dashboard.req.dto';
import { ExecutionRequestDto } from '../../dtos/user-exercise/request/done-exercise-request.dto';
import { GetUserExerciseRequest } from '../../dtos/user-exercise/request/get-user-exercise.request';
import { GetUserProgramRequest } from '../../dtos/user-exercise/request/get-user-program.request';
import { GetUserSessionRequest } from '../../dtos/user-exercise/request/get-user-session.request';
import { UserExerciseResponse } from '../../dtos/user-exercise/response/user-exercise.response';
import { UserSessionResponse } from '../../dtos/user-exercise/response/user-session.response';
import { ProgressStatus } from '../../enums/progress.status';
import { TargetType } from '../../enums/target.type';
import { Exercise } from '../../repositories/exercise/exercise';
import { ExercisesRepository } from '../../repositories/exercise/exercises.repository';
import { IExercisesRepository } from '../../repositories/exercise/exercises.repository.interface';
import {
  PROGRAMS_MODEL,
  Program,
  ProgramsDocument,
} from '../../repositories/program/program';
import { ProgramsRepository } from '../../repositories/program/programs.repository';
import { IProgramsRepository } from '../../repositories/program/programs.repository.interface';
import { Session } from '../../repositories/session/session';
import { SessionsRepository } from '../../repositories/session/sessions.repository';
import { ISessionRepository } from '../../repositories/session/sessions.repository.interface';
import {
  USER_EXERCISES_MODEL,
  UserExecution,
} from '../../repositories/user-exercise/user-execution';
import { UserExerciseRepository } from '../../repositories/user-exercise/user-execution.repository';
import { IUserExerciseRepository } from '../../repositories/user-exercise/user-execution.repository.interface';
import { IExecutionUtil } from './execution-util/execution.util.interface';
import { ExecutionUtilService } from './execution-util/execution.util.service';
import { ResponseUtil } from './response-util/response.util';
import { IResponseUtil } from './response-util/response.util.interface';
import { IUserExercisesService } from './user-exercises.sevice.interface';
import { UserProgramTab } from '../../enums/user-program-tab';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { getBioUrl } from '../../../../utils/get-bio-url';
import { ResultGetPrograms } from '../../dtos/program/get-programs.dto';
import { IStatisticalProgramDone } from '../../interface/statistical-program-done.interface';
import { convertAgeToString } from '../../../../utils/convert-age-to-string';
import {
  genQuerySort,
  genQueryStr,
  generatePipelineGet,
  getNextSessionByProgramId,
  pipelineGetprogram,
} from '../../utils/generate-query.programs';
import { EShareWith } from '../../enums/share.status';
import { RunExerciseResponseDto } from '../../dtos/user-exercise/user-exercise-response.dto';

@Injectable()
export class UserExercisesService
  extends AbstractService<IUserExerciseRepository>
  implements IUserExercisesService
{
  constructor(
    @InjectModel(PROGRAMS_MODEL)
    private readonly programModel: mongoose.Model<ProgramsDocument>,
    @InjectModel(USER_EXERCISES_MODEL)
    private userExercisesModel: mongoose.Model<UserExecution>,

    @Inject(UserExerciseRepository)
    private userExercisesRepository: IUserExerciseRepository,
    @Inject(ProgramsRepository)
    private programRepository: IProgramsRepository,
    @Inject(SessionsRepository)
    private sessionRepository: ISessionRepository,
    @Inject(ExercisesRepository)
    private exercisesRepository: IExercisesRepository,

    @Inject(ResponseUtil)
    private responseUtil: IResponseUtil,
    @Inject(ExecutionUtilService)
    private executionUtil: IExecutionUtil,
  ) {
    super(userExercisesRepository);
  }

  async toggleBookmarkedProgram(
    currentUserId: string,
    programId: string,
  ): Promise<void> {
    const program: Program = await this.programRepository.customedFindOne(
      {
        _id: programId,
      },
      {
        _id: 1,
        bookmarkUserIds: 1,
      },
    );
    if (!program) {
      throw new BadRequestException(ResponseMessage.Program.NOT_FOUND);
    }

    const bookmarkUserIds: string[] = program.bookmarkUserIds;
    const isIncludesUserId: boolean = bookmarkUserIds.includes(currentUserId);

    const newBookmarkUserIds: string[] =
      isIncludesUserId === true
        ? bookmarkUserIds.filter((e) => e !== currentUserId)
        : bookmarkUserIds.concat(currentUserId);

    await this.programRepository.createOrUpdate(
      { bookmarkUserIds: newBookmarkUserIds } as Program,
      {
        _id: program._id.toString(),
      },
    );
  }

  async clearExecution(
    programId: string,
    currentUserId: string,
  ): Promise<void> {
    await this.repository.deleteHard({
      programId: new Types.ObjectId(programId),
      userId: currentUserId,
    });
  }

  async runExercise(
    currentUserId: string,
    request: ExecutionRequestDto,
  ): Promise<RunExerciseResponseDto> {
    const { exerciseId } = request;

    const exercise: Exercise = await this.exercisesRepository.getOne({
      _id: exerciseId,
      isDeleted: false,
      $expr: {
        $cond: {
          if: { $eq: ['$createdBy', currentUserId] },
          then: true,
          else: { $eq: ['$shareWith', EShareWith.ALL] },
        },
      },
    });

    const session: Session = await this.sessionRepository.getOne({
      _id: exercise.sessionId,
      isDeleted: false,
      $expr: {
        $cond: {
          if: { $eq: ['$createdBy', currentUserId] },
          then: true,
          else: { $eq: ['$shareWith', EShareWith.ALL] },
        },
      },
    });

    if ((exercise && !session) || !exercise) {
      throw new NotFoundException(ResponseMessage.Exercise.NOT_FOUND);
    }
    await Promise.all([
      this.executionUtil.validateAlreadyDone(currentUserId, request),
      this.executionUtil.validateProgress(
        exercise.sessionId,
        request,
        currentUserId,
      ),
    ]);

    /**
     * This logic must be in a flow like this.
     * DO NOT: put them into Promise.all()
     */
    await this.executionUtil.updateProgressExercise(
      currentUserId,
      session.programId,
      session._id,
      exercise._id,
    );
    const sessionStatus = await this.executionUtil.updateProgressSession(
      currentUserId,
      exercise.sessionId,
    );
    const programStatus = await this.executionUtil.updateProgressProgram(
      currentUserId,
      session.programId,
    );

    const generatePipelineGetNextSession = getNextSessionByProgramId(
      currentUserId,
      session.programId,
      exercise.sessionId,
      session.order,
    );

    const nextSession = await this.sessionRepository.aggregate(
      generatePipelineGetNextSession,
    );

    return this.executionUtil.validateDone(
      programStatus,
      sessionStatus,
      nextSession.length ? nextSession[0]._id : '',
    );
  }

  async getProgressStatus(
    userExercise: UserExecution,
  ): Promise<ProgressStatus> {
    if (userExercise.targetType == TargetType.SESSION) {
      const numExerciseInSession: number = await this.exercisesRepository.count(
        {
          sessionId: userExercise.targetId,
          isDeleted: false,
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
      });
      const numDoneSession: number = await this.repository.count({
        userId: userExercise.userId,
        parentId: userExercise.targetId,
        targetType: TargetType.SESSION,
        status: ProgressStatus.DONE,
        isDeleted: false,
      });
      return numSessionInProgram == numDoneSession
        ? ProgressStatus.DONE
        : ProgressStatus.ACTIVE;
    }
  }

  generateLeaderboardCondition(getLeaderboard: GetUserProgramRequest) {
    const matchCondition: any[] = [];
    // const filterCondition: Object ;
    Object.entries(getLeaderboard)
      .filter((e) => e[1])
      .forEach((e) => {
        switch (e[0]) {
          case 'clubId': {
            matchCondition.push({
              clubId: e[1],
            });
            break;
          }

          case 'role': {
            matchCondition.push({
              role: { $in: [e[1]] },
            });
            break;
          }

          case 'country': {
            matchCondition.push({
              'birthCountry.name': e[1],
            });
            break;
          }

          case 'ageGroup': {
            if (e[1] == AgeGroup.ADULT) {
              const thisYear: number = this.dateUtil
                .getNowDate()
                .getUTCFullYear();
              const adultYear: number = thisYear - 20;

              matchCondition.push({
                $expr: {
                  $lt: [{ $toInt: '$birthYear' }, adultYear],
                },
              });
            } else {
              const [genderCharactor, birthYear] = e[1].split('_');
              const gender: GenderTypes =
                genderCharactor == 'G' ? GenderTypes.Female : GenderTypes.Male;

              matchCondition.push({
                birthYear,
              });
              matchCondition.push({
                gender,
              });
            }
          }

          default:
            break;
        }
      });

    return matchCondition;
  }

  async getSession(
    currentUserId: string,
    getRequest: GetUserSessionRequest,
  ): Promise<UserSessionResponse[]> {
    const { programId, startAfter, limit, sorted } = getRequest;
    const skip = (startAfter - 1) * limit;
    const program: Program = await this.programRepository.customedFindOne({
      _id: programId,
      isDeleted: false,
    });
    if (!program) {
      throw new NotFoundException(ResponseMessage.Program.NOT_FOUND);
    }

    const pipeline = generatePipelineGet(
      currentUserId,
      TargetType.PROGRAM,
      programId,
      skip,
      limit,
      sorted,
    );
    const sessions: Session[] = await this.sessionRepository.aggregate(
      pipeline,
    );

    const sessionResponses: UserSessionResponse[] = await Promise.all(
      sessions.map(async (session) => {
        const userSession: UserExecution =
          await this.repository.customedFindOne({
            userId: currentUserId,
            isDeleted: false,
            targetId: session._id,
            targetType: TargetType.SESSION,
          });
        const user: UserInfoDto = await mappingUserInfoById(session.createdBy);
        return this.responseUtil.generateSessionResponse(
          currentUserId,
          session,
          userSession,
          user,
        );
      }),
    );

    this.attachReadyStatusToResponse(sessionResponses);

    await this.updateNumberExecutedForProgram(program._id.toString());
    return sessionResponses;
  }

  async getExercise(
    currentUserId: string,
    getRequest: GetUserExerciseRequest,
  ): Promise<UserExerciseResponse[]> {
    const { sessionId, startAfter, limit, sorted } = getRequest;
    const skip = (startAfter - 1) * limit;
    const session: Session = await this.sessionRepository.customedFindOne({
      _id: getRequest.sessionId,
      isDeleted: false,
      $expr: {
        $cond: {
          if: { $eq: ['$createdBy', currentUserId] },
          then: true,
          else: { $eq: ['$shareWith', EShareWith.ALL] },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(ResponseMessage.Session.NOT_FOUND);
    }

    const pipeline = generatePipelineGet(
      currentUserId,
      TargetType.SESSION,
      sessionId,
      skip,
      limit,
      sorted,
    );

    //# process exercise response
    const exercises: Exercise[] = await this.exercisesRepository.aggregate(
      pipeline,
    );
    const userExerciseResponse: UserExerciseResponse[] = await Promise.all(
      exercises.map(async (exercise) => {
        const userExercise: UserExecution =
          await this.repository.customedFindOne({
            parentId: session._id,
            targetId: exercise._id,
            targetType: TargetType.EXERCISE,
            isDeleted: false,
            userId: currentUserId,
          });
        const user: UserInfoDto = await mappingUserInfoById(exercise.createdBy);

        return this.responseUtil.generateExerciseResponse(
          currentUserId,
          exercise,
          session,
          userExercise,
          user,
        );
      }),
    );
    this.attachReadyStatusToResponse(userExerciseResponse);

    //# process response
    return userExerciseResponse;
    // return this.responseUtil.generateWrapResponse(
    //   currentUserId,
    //   session,
    //   userExerciseResponse,
    // );
  }

  async updateNumberExecutedForProgram(programId: string): Promise<void> {
    const program: Program = await this.programRepository.customedFindOne({
      _id: programId,
      isDeleted: false,
    });
    if (!program) {
      return;
    }
    const numExecuted: number = await this.repository.count({
      targetId: program._id,
      targetType: TargetType.PROGRAM,
      isDeleted: false,
    });
    program.numberExecuted = numExecuted;
    await this.programRepository.createOrUpdate(program, {
      _id: program._id,
    });
  }

  attachReadyStatusToResponse<
    T extends UserSessionResponse | UserExerciseResponse,
  >(responses: T[]): void {
    if (!responses.length) {
      return;
    }
    let lastDoneIndex = -1;
    for (let index = 0; index < responses.length; index++) {
      if (responses[index].status == ProgressStatus.DONE) {
        lastDoneIndex = index;
      }
    }
    if (lastDoneIndex + 1 < responses.length) {
      responses[lastDoneIndex + 1].status = ProgressStatus.READY;
    }
  }

  async getProgram(
    currentUserId: string,
    getRequest: GetUserProgramRequest,
  ): Promise<ResultGetPrograms> {
    const { limit, startAfter, userId, programSort } = getRequest;
    const skip = (startAfter - 1) * limit;
    const matchQueryStr = genQueryStr(currentUserId, getRequest);
    const sortQueryStr = programSort
      ? genQuerySort(programSort)
      : { createdAt: -1 };
    const pipline: any[] = pipelineGetprogram(
      matchQueryStr,
      sortQueryStr,
      userId || currentUserId,
      skip,
      limit,
    );
    const result = await this.programModel.aggregate(pipline);
    const totalData = await this.programModel.countDocuments(matchQueryStr);
    const totalPage = Math.ceil(totalData / limit);
    for (const values of result) {
      values['bioUrl'] = getBioUrl({
        type: values.type,
        username: values.username,
        lastName: values.lastName,
        firstName: values.firstName,
      });
      values['programStatus'] = values.programStatus || null;
      values['ageFrom'] = convertAgeToString(parseInt(values?.ageFrom));
      values['ageTo'] = convertAgeToString(parseInt(values?.ageTo));
      values['createdAt'] = +this.dateUtil.convertDateToFormat(
        values.createdAt,
        'x',
      );
      values['updatedAt'] = +this.dateUtil.convertDateToFormat(
        values.updatedAt,
        'x',
      );
      values['linkShare'] = `${
        process.env.WEB_BASE_URL
      }/programs/sessions/${values._id.toString()}`;
      values['currentUserVoting'] =
        values?.ratings?.find((e) => e.createdBy === currentUserId)?.star || 0;
      values['isSaved'] = values?.bookmarkUserIds.includes(currentUserId);
    }
    return { data: result, totalPage, currentPage: +startAfter };
  }

  async statisticalProgramDone(
    userId: string,
  ): Promise<IStatisticalProgramDone> {
    let match = {
      userId: userId,
    };

    const resp = await this.userExercisesModel.aggregate([
      {
        $match: match,
      },
      {
        $lookup: {
          from: PROGRAMS_MODEL,
          localField: 'programId',
          foreignField: '_id',
          as: 'program',
        },
      },
      {
        $unwind: {
          path: '$program',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          totalTactical: {
            $cond: [
              {
                $and: [
                  { $eq: ['$program.mainCategory', UserProgramTab.TACTICAL] },
                  { $eq: ['$targetType', TargetType.PROGRAM] },
                  { $eq: ['$status', ProgressStatus.DONE] },
                ],
              },
              1,
              0,
            ],
          },
          totalTechnical: {
            $cond: [
              {
                $and: [
                  { $eq: ['$program.mainCategory', UserProgramTab.TECHNICAL] },
                  { $eq: ['$targetType', TargetType.PROGRAM] },
                  { $eq: ['$status', ProgressStatus.DONE] },
                ],
              },
              1,
              0,
            ],
          },
          totalPhysical: {
            $cond: [
              {
                $and: [
                  { $eq: ['$program.mainCategory', UserProgramTab.PHYSICAL] },
                  { $eq: ['$targetType', TargetType.PROGRAM] },
                  { $eq: ['$status', ProgressStatus.DONE] },
                ],
              },
              1,
              0,
            ],
          },
          totalMental: {
            $cond: [
              {
                $and: [
                  { $eq: ['$program.mainCategory', UserProgramTab.MENTAL] },
                  { $eq: ['$targetType', TargetType.PROGRAM] },
                  { $eq: ['$status', ProgressStatus.DONE] },
                ],
              },
              1,
              0,
            ],
          },
          totalOther: {
            $cond: [
              {
                $and: [
                  { $eq: ['$program.mainCategory', UserProgramTab.OTHER] },
                  { $eq: ['$targetType', TargetType.PROGRAM] },
                  { $eq: ['$status', ProgressStatus.DONE] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalTactical: { $sum: '$totalTactical' },
          totalTechnical: { $sum: '$totalTechnical' },
          totalPhysical: { $sum: '$totalPhysical' },
          totalMental: { $sum: '$totalMental' },
          totalOther: { $sum: '$totalOther' },
        },
      },
    ]);

    return {
      totalTactical: resp[0]?.totalTactical || 0,
      totalTechnical: resp[0]?.totalTechnical || 0,
      totalPhysical: resp[0]?.totalPhysical || 0,
      totalMental: resp[0]?.totalMental || 0,
      totalOther: resp[0]?.totalOther || 0,
    };
  }

  async activateProgram(programId: string, userId: string) {
    const program = await this.programModel.findById(programId);

    if (program) {
      const programActiveRecord = await this.userExercisesModel.findOne({
        targetId: programId,
        targetType: TargetType.PROGRAM,
        userId,
        status: ProgressStatus.ACTIVE,
      });

      if (!programActiveRecord) {
        await this.userExercisesModel.create({
          _id: new Types.ObjectId(),
          parentId: null,
          targetId: program._id,
          targetType: TargetType.PROGRAM,
          userId,
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
      }
    }
  }
}

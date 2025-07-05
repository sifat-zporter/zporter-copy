import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as mongoose from 'mongoose';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { SortBy } from '../../../../common/pagination/pagination.dto';
import { UsersService } from '../../../users/v1/users.service';
import { GetSessionsByProgramId } from '../../dtos/session/get-sessions.dto';
import { SessionsRequestDto } from '../../dtos/session/sessions-request.dto';
import SessionResponseDto from '../../dtos/session/sessions-response.dto';
import { Exercise } from '../../repositories/exercise/exercise';
import { ExercisesRepository } from '../../repositories/exercise/exercises.repository';
import {
  PROGRAM_SESSIONS_MODEL,
  Session,
} from '../../repositories/session/session';
import { SessionsRepository } from '../../repositories/session/sessions.repository';
import { SessionSupportService } from './support/session.support.service';
import { InjectModel } from '@nestjs/mongoose';
import { ITotalCommonService } from '../total/total.service.interface';
import { ExercisesService } from '../exercise/exercises.service';
import { ExerciseResponseDto } from '../../dtos/exercise/exercises-response.dto';
import { GetDetailResponse } from '../../dtos/program/programs-response.dto';
import { Types } from 'mongoose';
import { ILibResponse } from '../../../libraries/interface/response.interface';
import { Program } from '../../repositories/program/program';

@Injectable()
export class SessionsService implements ITotalCommonService {
  constructor(
    @Inject(SessionsRepository)
    private sessionRepository: SessionsRepository,
    @Inject(ExercisesRepository)
    private exerciseRepository: ExercisesRepository,
    private usersService: UsersService,
    private supportService: SessionSupportService,
    private exerciseService: ExercisesService,

    @InjectModel(PROGRAM_SESSIONS_MODEL)
    private programSessionModel: mongoose.Model<Session>,
  ) {}

  async createManySession(
    requests: SessionsRequestDto[],
    program: Program,
    isNewProgram: boolean,
  ): Promise<void> {
    // await this.supportService.validateHeadline(
    //   requests,
    //   program._id,
    //   isNewProgram,
    // );

    const newSessionIds: string[] = [];
    const sessions: Session[] = requests.map((request) => {
      if (request?.id) {
        newSessionIds.push(request.id.toString());
      }

      return this.supportService.generateSession(
        request,
        program,
        isNewProgram,
      );
    });

    // update sessions
    if (sessions.length) {
      await this.sessionRepository.createOrUpdateMany(sessions);

      // create exercises
      await Promise.all(
        requests.map((s, index) => {
          if (s.exercises?.length) {
            return this.exerciseService.createManyExercise(
              s.exercises,
              sessions[index],
              isNewProgram,
            );
          }
          return Promise.resolve();
        }),
      );
    }
  }

  async duplicateSession(
    sessionId: string,
    currentUserId: string,
  ): Promise<void> {
    const session: Session = await this.sessionRepository.getOne({
      _id: sessionId,
    });
    if (!session) {
      throw new NotFoundException(ResponseMessage.Session.NOT_FOUND);
    }

    const newHeadline = `${session.headline}(copy)`;
    await this.validateSessionHeadline(
      newHeadline,
      session.programId,
      session._id.toString(),
    );

    //# update session's information

    session._id = new mongoose.Types.ObjectId();
    session.headline = newHeadline;
    session.createdBy = currentUserId;
    session.isDeleted = false;

    await this.sessionRepository.createOrUpdate(session);
  }

  async validateSessionHeadline(
    headline: string,
    programId: mongoose.Types.ObjectId,
    programSessionId?: string,
  ): Promise<void> {
    try {
      const numberExercise: number = programSessionId
        ? await this.sessionRepository.count({
            _id: { $ne: programSessionId },
            programId: programId,
            headline: headline,
            isDeleted: false,
          })
        : await this.sessionRepository.count({
            programId: programId,
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

  async validateExistedSession(sessionId: string): Promise<void> {
    const session: Session = await this.sessionRepository.getOne({
      _id: sessionId,
      isDeleted: false,
    });
    if (!session) {
      throw new NotFoundException(ResponseMessage.Session.NOT_FOUND);
    }
  }

  async getSessionById(sessionId: string): Promise<SessionResponseDto> {
    try {
      const session = await this.sessionRepository.customedFindOne({
        _id: sessionId,
        isDeleted: false,
      });

      if (!session) {
        throw new NotFoundException('Cannot find this session.');
      }

      const sessionResponse: SessionResponseDto =
        await this.supportService.generateSessionResponse(session);
      return sessionResponse;
    } catch (error) {
      throw error;
    }
  }

  async getSessionsByProgramId(
    getSessionsByProgramId: GetSessionsByProgramId,
  ): Promise<SessionResponseDto[]> {
    const {
      programId,
      limit: pageSize,
      startAfter: page,
      sorted,
    } = getSessionsByProgramId;

    const sort = sorted == SortBy.ASC ? 1 : -1;
    try {
      const sessions = await this.sessionRepository.get({
        match: {
          programId: new Types.ObjectId(programId),
          isDeleted: false,
        },
        keySort: {
          createdAt: sort,
        },
        page: +page,
        pageSize: +pageSize,
      });

      const result: SessionResponseDto[] = await Promise.all(
        sessions.map((session) => {
          return this.supportService.generateSessionResponse(session);
        }),
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const numExercises: number = await this.exerciseRepository.count({
      sessionId: sessionId,
      isDeleted: false,
    });

    /**
     * THIS CASE: temporarily accept delete without check 'children'
     * TODO: using 'bulkWrite' or `TTL index` or something like that for delete many docs without dead inside
     */
    // if (numExercises) {
    //   throw new BadRequestException(ResponseMessage.Session.CAN_NOT_DELETE);
    // }

    const numSession = await this.sessionRepository.count({
      _id: sessionId,
    });
    if (!numSession) {
      throw new NotFoundException(ResponseMessage.Session.NOT_FOUND);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    const deleteOption: Object = {
      isDeleted: true,
    };

    await this.sessionRepository.deleteHardUsingBulkWrite(
      {
        _id: sessionId,
      },
      deleteOption as Session,
    );

    if (numExercises) {
      await this.exerciseRepository.deleteHardUsingBulkWrite(
        { sessionId },
        deleteOption as Exercise,
      );
    }
  }

  async createOrUpdateSessions(sessions: SessionsRequestDto[]): Promise<any> {
    const session = await this.programSessionModel.startSession();
    await session.withTransaction(async () => {
      const listOldSessions = sessions.filter((session) =>
        mongoose.Types.ObjectId.isValid(session.id),
      );
      const promise = [];

      // for (const session of sessions) {
      //   delete session.id;
      // }

      const bulkWriteOperations = listOldSessions.map((values) => {
        return {
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(values.id) },
            update: { $set: values },
            upsert: true,
          },
        };
      });

      promise.push(
        this.programSessionModel.bulkWrite(bulkWriteOperations, {
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

  async getChildrenByProgramId(programId: string): Promise<ILibResponse[]> {
    const sessions: ILibResponse[] = await this.getSessionsByProgramId({
      programId,
      limit: 99,
      startAfter: 1,
    });
    const mappingSessionResult = await Promise.all(
      sessions.map(async (session: ILibResponse) => {
        const exercises: ILibResponse[] =
          await this.exerciseService.getExercisesBySessionId({
            sessionId: session.id,
            limit: 99,
            startAfter: 1,
          });
        const result: ILibResponse = { exercises, ...session };
        return result;
      }),
    );
    return mappingSessionResult;
  }

  async getDetailById(sessionId: string): Promise<GetDetailResponse> {
    const session: SessionResponseDto = await this.getSessionById(sessionId);
    const exercises: ExerciseResponseDto[] =
      await this.exerciseService.getExercisesBySessionId({
        sessionId: session.id,
        limit: 99,
        startAfter: 1,
      });
    return new GetDetailResponse({
      sessions: [
        {
          ...session,
          exercises,
        },
      ],
    });
  }
}

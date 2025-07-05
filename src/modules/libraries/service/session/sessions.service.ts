import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as mongoose from 'mongoose';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { SortBy } from '../../../../common/pagination/pagination.dto';
import { AbstractService } from '../../../abstract/abstract.service';
import { LibSessionSupportService } from './support/session.support.service';
import SessionResponseDto from '../../../programs/dtos/session/sessions-response.dto';
import { GetSessionsByProgramId } from '../../../programs/dtos/session/get-sessions.dto';
import { SessionsRequestDto } from '../../../programs/dtos/session/sessions-request.dto';
import { Session } from '../../../programs/repositories/session/session';
import { Exercise } from '../../../programs/repositories/exercise/exercise';
import { ILibSessionService } from './sessions.service.interface';
import { ILibFactoryRepository } from '../../repository/lib-factory.repository.interface';
import { LibFactoryRepository } from '../../repository/lib-factory.repository';
import { LibraryType } from '../../enum/library.type';
import { ILibEntity } from '../../interface/entity.interface';
import { LibProgramsService } from '../program/programs.service';
import { LibSessionRepository } from '../../repository/session/lib.session.repository';
import { ISessionRepository } from '../../../programs/repositories/session/sessions.repository.interface';
import { GetDetailResponse } from '../../../programs/dtos/program/programs-response.dto';
import { LibraryService } from '../library.service';
import { ILibService } from '../library.service.interface';
import { ILibResponse } from '../../interface/response.interface';
import { LibExercisesService } from '../exercise/exercises.service';
import { ILibExercisesService } from '../exercise/exercises.sevice.interface';
import { Types } from 'mongoose';
import { DateUtil } from '../../../../utils/date-util';
import { Program } from '../../../programs/repositories/program/program';

@Injectable()
export class LibSessionsService
  extends AbstractService<ILibFactoryRepository>
  implements ILibSessionService
{
  constructor(
    @Inject(forwardRef(() => LibProgramsService))
    private programService: LibProgramsService,

    @Inject(LibraryService)
    private libraryService: ILibService,

    @Inject(LibFactoryRepository)
    private libFactoryRepository: ILibFactoryRepository,

    @Inject(LibSessionRepository)
    private sessionRepository: ISessionRepository,

    @Inject(LibExercisesService)
    private libExercisesService: ILibExercisesService,

    private supportService: LibSessionSupportService,
  ) {
    super(libFactoryRepository);
  }

  async createManySession(
    requests: SessionsRequestDto[],
    program: Program,
    currentUserId: string,
  ): Promise<void> {
    const sessionIdsUpdate: string[] = [];
    if (program.isPublic) {
      this.supportService.validateHeadline(requests);
    }

    // Filter out requests with existing headlines
    const filteredRequests = await this.filterRequestsWithExistingHeadlines(
      requests,
      currentUserId,
    );

    const sessions: Session[] = filteredRequests.map((request) => {
      request.programId = program._id;
      if (request.id) {
        sessionIdsUpdate.push(request.id.toString());
      }

      return this.supportService.generateSession(request, currentUserId);
    });

    // create sessions in library
    await this.sessionRepository.createOrUpdateMany(sessions);

    // create exercies in library
    await Promise.all(
      filteredRequests.map((request) => {
        this.libExercisesService.createManyExercise(request, currentUserId);
      }),
    );
  }

  private async filterRequestsWithExistingHeadlines(
    requests: SessionsRequestDto[],
    currentUserId: string,
  ): Promise<SessionsRequestDto[]> {
    const filteredRequests: SessionsRequestDto[] = [];

    for (const request of requests) {
      const headlineExists = await this.checkHeadlineExists(
        request.headline,
        currentUserId,
      );

      if (!headlineExists) {
        filteredRequests.push(request);
      }
    }

    return filteredRequests;
  }

  private async checkHeadlineExists(
    headline: string,
    currentUserId: string,
  ): Promise<boolean> {
    const count = await this.repository
      .getLibRepository(LibraryType.SESSION)
      .count({
        headline: headline,
        createdBy: currentUserId,
        isDeleted: false,
      });

    return count > 0;
  }

  async duplicateSession(
    sessionId: string,
    currentUserId: string,
  ): Promise<void> {
    const session: ILibEntity = await this.repository
      .getLibRepository(LibraryType.SESSION)
      .customedFindOne({
        _id: sessionId,
      });
    if (!session) {
      throw new NotFoundException(ResponseMessage.Session.NOT_FOUND);
    }

    const newSession: ILibEntity = session;

    const newHeadline: string = `${session.headline}(copy)`;
    // await this.validateSessionHeadline(
    //   newHeadline,
    //   newSession.programId,
    //   newSession._id.toString(),
    // );

    //# update session's information
    const nowTime: number = this.dateUtil.getNowTimeInMilisecond();

    newSession._id = new mongoose.Types.ObjectId();
    newSession.headline = newHeadline;
    newSession.createdBy = currentUserId;
    newSession.isDeleted = false;

    await this.repository
      .getLibRepository(LibraryType.SESSION)
      .createOrUpdate(newSession, { _id: newSession._id.toString() });
  }

  async createSession(request: SessionsRequestDto, userRoleId: string) {
    // validate headline
    await this.validateSessionHeadline(
      request.headline,
      request.id.toString(),
      request.programId,
    );

    const session = this.supportService.generateSession(request, userRoleId);

    await this.sessionRepository.createOrUpdate(
      {
        ...session,
      },
      {
        _id: session._id,
      },
    );

    if (request.exercises) {
      await this.libExercisesService.createManyExercise(request, userRoleId);
    }
  }

  async validateSessionHeadline(
    headline: string,
    programSessionId: string,
    programId: mongoose.Types.ObjectId,
  ): Promise<void> {
    if (programId) {
      const checkExists = await this.repository
        .getLibRepository(LibraryType.SESSION)
        .count({
          _id: {
            $ne: programSessionId,
          },
          programId: programId,
          headline: headline,
          isDeleted: false,
        });
      if (checkExists) {
        throw new HttpException(
          `Session: '${headline}' ${ResponseMessage.Program.DUPLICATED_HEADLINE}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  async validateExistedSession(sessionId: string): Promise<void> {
    const session: ILibEntity = await this.repository
      .getLibRepository(LibraryType.SESSION)
      .customedFindOne({
        _id: sessionId,
        isDeleted: false,
      });
    if (!session) {
      throw new NotFoundException(ResponseMessage.Session.NOT_FOUND);
    }
  }

  async getSessionById(sessionId: string): Promise<SessionResponseDto> {
    try {
      const session = await this.repository
        .getLibRepository(LibraryType.SESSION)
        .customedFindOne({
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
      const sessions = await this.repository
        .getLibRepository(LibraryType.SESSION)
        .customedFind({
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
    const numExercises: number = await this.repository
      .getLibRepository(LibraryType.EXERCISE)
      .count({
        sessionId: sessionId,
        isDeleted: false,
      });

    const numSession = await this.repository
      .getLibRepository(LibraryType.SESSION)
      .count({
        _id: sessionId,
      });
    if (!numSession) {
      throw new NotFoundException(ResponseMessage.Session.NOT_FOUND);
    }

    const deleteOption: Object = {
      isDeleted: true,
      deletedAt: this.dateUtil.getNowDate(),
    };

    await this.repository
      .getLibRepository(LibraryType.SESSION)
      .createOrUpdate(deleteOption as Session, { _id: sessionId });

    if (numExercises) {
      await this.repository
        .getLibRepository(LibraryType.EXERCISE)
        .createOrUpdate(deleteOption as Exercise, { sessionId });
    }
  }

  async toggleBookmarked(currentUserId: string, id: string) {
    const session: Session = await this.sessionRepository.customedFindOne(
      {
        _id: id,
      },
      {
        _id: 1,
        bookmarkUserIds: 1,
      },
    );
    if (!session) {
      throw new BadRequestException(ResponseMessage.Session.NOT_FOUND);
    }

    const bookmarkUserIds: string[] = session.bookmarkUserIds;
    const isIncludesUserId: boolean = bookmarkUserIds.includes(currentUserId);

    const newBookmarkUserIds: string[] =
      isIncludesUserId === true
        ? bookmarkUserIds.filter((e) => e !== currentUserId)
        : bookmarkUserIds.concat(currentUserId);

    await this.sessionRepository.createOrUpdate(
      { bookmarkUserIds: newBookmarkUserIds } as Session,
      {
        _id: session._id.toString(),
      },
    );
  }

  async getChildrenByProgramId(
    currentUserId: string,
    programId: string,
  ): Promise<ILibResponse[]> {
    const sessions: ILibResponse[] =
      await this.libraryService.getLibChildrenById(
        currentUserId,
        programId,
        LibraryType.SESSION,
        {
          limit: 99,
          startAfter: 1,
        },
      );
    const mappingSessionResult = await Promise.all(
      sessions.map(async (session: ILibResponse) => {
        const exercises: ILibResponse[] =
          await this.libraryService.getLibChildrenById(
            currentUserId,
            session.id,
            LibraryType.EXERCISE,
            {
              limit: 99,
              startAfter: 1,
            },
          );
        const result: ILibResponse = { exercises, ...session };
        return result;
      }),
    );
    return mappingSessionResult;
  }

  async getDetailById(
    currentUserId: string,
    sessionId: string,
  ): Promise<GetDetailResponse> {
    const session: SessionResponseDto = await this.getSessionById(sessionId);
    const exercises: ILibResponse[] =
      await this.libraryService.getLibChildrenById(
        currentUserId,
        sessionId,
        LibraryType.EXERCISE,
        {
          limit: 99,
          startAfter: 1,
        },
      );
    return new GetDetailResponse({
      sessions: [
        {
          ...session,
          exercises,
        },
      ],
    });
  }

  async softDelete(doc: ILibEntity, docId: string): Promise<void> {
    await this.repository
      .getLibRepository(LibraryType.SESSION)
      .createOrUpdate(doc, { _id: docId });
    const exercises: ILibEntity[] = await this.repository
      .getLibRepository(LibraryType.EXERCISE)
      .get({
        match: { sessionId: new Types.ObjectId(docId), isDeleted: false },
      });

    exercises.forEach(async (exercise) => {
      exercise.isDeleted = true;
      exercise.deletedAt = new DateUtil().getNowDate();
      await this.repository
        .getLibRepository(LibraryType.EXERCISE)
        .createOrUpdate(exercise, { _id: docId });
    });
  }
}

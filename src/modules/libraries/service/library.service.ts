import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { SortBy } from '../../../common/pagination/pagination.dto';
import { DateUtil } from '../../../utils/date-util';
import { AbstractService } from '../../abstract/abstract.service';
import { LibRequestDto } from '../dto/request/lib.request.dto';
import { LibraryType } from '../enum/library.type';
import { ILibEntity } from '../interface/entity.interface';
import { ILibResponse } from '../interface/response.interface';
import { LibFactoryRepository } from '../repository/lib-factory.repository';
import { LibMinorService as LibMinorService } from './lib.minor.service';
import { ILibService } from './library.service.interface';
import { LibValidateService } from './lib.validate.service';
import { ProgramTotalRequestDto } from '../../programs/dtos/program-total-request.dto';
import { LibProgramsService } from './program/programs.service';
import { LibFactoryService } from './lib-factory.service';
import { GetLibRequestDto } from '../dto/request/get-lib.request.dto';
import {
  genQuerySort,
  genQueryStrLib,
  pipelineGetLibrary,
} from '../utils/generate-query.library';
import { LibraryTab } from '../enum/library.tab';
import { MediaDto } from '../../diaries/dto/diary.dto';
import { MediaUtil } from '../../../utils/media-util';
import { MediaSource } from '../../programs/repositories/program/media-source';
import { GetLibChildrenRequest } from '../dto/request/get-sessions.req';
import { Types } from 'mongoose';
import { EShareWith } from '../../programs/enums/share.status';
import { ILibProgramsService } from './program/program.service.interface';
import { ExercisesRequestDto } from '../../programs/dtos/exercise/exercises-request.dto';
import { SessionsRequestDto } from '../../programs/dtos/session/sessions-request.dto';
import { GetDetailResponse } from '../../programs/dtos/program/programs-response.dto';

@Injectable()
export class LibraryService
  extends AbstractService<LibFactoryRepository>
  implements ILibService
{
  constructor(
    @Inject(LibMinorService)
    private minorService: LibMinorService,
    @Inject(LibValidateService)
    private validateService: LibValidateService,
    @Inject(LibFactoryRepository)
    private libRepository: LibFactoryRepository,

    @Inject(LibFactoryService)
    private libService: LibFactoryService,

    @Inject(forwardRef(() => LibProgramsService))
    private programService: ILibProgramsService,
  ) {
    super(libRepository);
  }

  async createSession(request: SessionsRequestDto, userRoleId: string) {
    return this.libService.libSessionService.createSession(request, userRoleId);
  }

  async createExercise(request: ExercisesRequestDto, userRoleId: string) {
    return this.libService.libExerciseService.createExercise(
      request,
      userRoleId,
    );
  }

  async createProgram(
    request: ProgramTotalRequestDto,
    currentUserId: string,
  ): Promise<void> {
    if (!request.program) {
      throw new HttpException('program is required', HttpStatus.BAD_REQUEST);
    }

    return this.programService.createOrUpdate(request.program, currentUserId);
  }

  async create(
    currentUserId: string,
    libRequest: LibRequestDto,
    type: LibraryType,
  ): Promise<void> {
    await this.validateService.validateHeadline(
      this.repository.getLibRepository(type),
      libRequest.headline,
    );

    const doc: ILibEntity = this.minorService.createEntity(
      currentUserId,
      libRequest,
      type,
    );

    await this.repository.getLibRepository(type).createOrUpdate(doc, {
      _id: doc._id.toString(),
    });
  }

  async update(
    currentUserId: string,
    libRequest: LibRequestDto,
    type: LibraryType,
    docId: string,
  ): Promise<void> {
    await this.validateService.validateHeadline(
      this.repository.getLibRepository(type),
      libRequest.headline,
      docId,
    );

    const doc: ILibEntity = await this.repository
      .getLibRepository(type)
      .customedFindOne({
        _id: docId,
        isDeleted: false,
      });

    if (!doc) {
      throw new NotFoundException(ResponseMessage.Library.NOT_FOUND);
    }

    if (libRequest?.media?.length) {
      libRequest.media.map((media) => {
        const mediaDto: MediaDto = new MediaUtil().processThumbnailVideo(media);
        return new MediaSource({
          source: mediaDto.source,
          thumbnail: mediaDto.thumbnail,
          type: mediaDto.type,
          uniqueKey: mediaDto.uniqueKey,
          url: mediaDto.url,
        });
      });
    }

    const newDoc: ILibEntity = this.objectMapper.convertValueCheckType<
      LibRequestDto,
      ILibEntity
    >(libRequest, doc, {
      updatedAt: this.dateUtil.getNowTimeInMilisecond(),
    });
    await this.repository.getLibRepository(type).createOrUpdate(newDoc, {
      _id: docId,
    });
  }

  async getMany(
    currentUserId: string,
    filterQuery: GetLibRequestDto,
    type: LibraryType,
    tab?: LibraryTab,
  ): Promise<ILibResponse[]> {
    const { limit, startAfter, programSort } = filterQuery;
    const skip = (startAfter - 1) * limit;
    const matchQueryStr = genQueryStrLib(currentUserId, filterQuery, tab);
    const sortQueryStr = programSort
      ? genQuerySort(programSort)
      : { createdAt: -1 };

    const pipeline: any[] = pipelineGetLibrary(
      matchQueryStr,
      skip,
      limit,
      sortQueryStr,
    );

    const docs: ILibEntity[] = await this.repository
      .getLibRepository(type)
      .aggregate(pipeline);
    return Promise.all(
      docs.map((e) =>
        this.minorService.generateResponse(currentUserId, type, e),
      ),
    );
  }

  async getManyV2(
    currentUserId: string,
    filterQuery: GetLibRequestDto,
    type: LibraryType,
    tab?: LibraryTab,
  ): Promise<ILibResponse[]> {
    const { limit, startAfter, sorted } = filterQuery;
    const skip = (startAfter - 1) * limit;

    const matchQueryStr = {};

    if (tab === LibraryTab.SAVED) {
      matchQueryStr['bookmarkUserIds'] = { $in: [currentUserId] };
    } else if (tab === LibraryTab.YOURS) {
      matchQueryStr['createdBy'] = currentUserId;
    } else {
      matchQueryStr['mainCategory'] = tab;
    }
    matchQueryStr['isDeleted'] = false;

    const docs: ILibEntity[] = await this.repository
      .getLibRepository(type)
      .customedFind({
        match: {
          ...matchQueryStr,
        },
        page: skip,
        pageSize: +limit,
        keySort: {
          createdAt: sorted == SortBy.ASC ? 1 : -1,
        },
      });

    return Promise.all(
      docs.map((e) =>
        this.minorService.generateResponseV2(currentUserId, type, e),
      ),
    );
  }

  async getOne(
    currentUserId: string,
    id: string,
    type: LibraryType,
  ): Promise<ILibResponse> {
    const doc: ILibEntity = await this.repository
      .getLibRepository(type)
      .customedFindOne({
        _id: id,
        isDeleted: false,
      });

    return this.minorService.generateResponse(currentUserId, type, doc);
  }

  async delete(docId: string, type: LibraryType): Promise<void> {
    const doc: ILibEntity = await this.repository
      .getLibRepository(type)
      .customedFindOne({ _id: docId }, { isDeleted: 1 });

    if (!doc) {
      throw new NotFoundException(ResponseMessage.Library.NOT_FOUND);
    }

    doc.isDeleted = true;
    doc.deletedAt = new DateUtil().getNowDate();
    await this.libService.getLibService(type).softDelete(doc, docId);
  }

  async handleLibTypeCopy(
    currentUserId: string,
    type: LibraryType,
    id: string,
    doc: any,
  ) {
    const indexArr = await this.repository.getLibRepository(type).customedFind({
      match: { idRoot: id, isDeleted: false },
      project: { index: 1 },
      keySort: { index: 1 },
    });

    const newLib: ILibEntity = this.minorService.createEntity(
      currentUserId,
      doc,
      type,
      indexArr,
    );

    await this.libRepository.getLibRepository(type).createOrUpdate(newLib, {
      _id: newLib._id.toString(),
    });
    return newLib._id;
  }

  async findSourceById(type: LibraryType, id: string) {
    const doc = (await this.repository
      .getSourceRepository(type)
      .customedFindOne({
        _id: id,
        isDeleted: false,
      })) as any;

    if (!doc) {
      throw new NotFoundException(ResponseMessage.Library.NOT_FOUND);
    }

    return doc;
  }

  async findSourceChildrenById(type: LibraryType, id: string) {
    const libTypeId: string =
      type === LibraryType.SESSION
        ? `${LibraryType.PROGRAM.toLowerCase()}Id`
        : `${LibraryType.SESSION.toLowerCase()}Id`;
    const matchQuery = {
      isDeleted: false,
    };
    matchQuery[`${libTypeId}`] = new Types.ObjectId(id);

    const doc = (await this.repository.getSourceRepository(type).get({
      match: matchQuery,
    })) as any[];

    if (!doc) {
      throw new NotFoundException(ResponseMessage.Library.NOT_FOUND);
    }

    return doc;
  }

  async handleCopyLibChildren(
    currentUserId: string,
    newProgramId: Types.ObjectId,
    programId: string,
    newSessionId?: Types.ObjectId,
    sessionId?: string,
  ) {
    const libraryType: LibraryType = sessionId
      ? LibraryType.EXERCISE
      : LibraryType.SESSION;
    const parentId = sessionId ? sessionId : programId;
    const docs = await this.findSourceChildrenById(libraryType, parentId);

    await Promise.all(
      docs.map(async (doc) => {
        const childrenDoc = await this.findSourceById(libraryType, doc._id);
        childrenDoc['programId'] = newProgramId;
        if (sessionId) childrenDoc['sessionId'] = newSessionId;

        const idRes = await this.handleLibTypeCopy(
          currentUserId,
          libraryType,
          doc._id,
          childrenDoc,
        );
        if (libraryType == LibraryType.SESSION)
          await this.handleCopyLibChildren(
            currentUserId,
            newProgramId,
            programId,
            idRes,
            doc._id,
          );
      }),
    );
  }

  async commonHandleCopy(currentUserId: string, type: LibraryType, id: string) {
    const doc = await this.findSourceById(type, id);
    await this.handleLibTypeCopy(currentUserId, type, id, doc);
  }

  async commonHandleCopyV2(
    currentUserId: string,
    type: LibraryType,
    id: string,
  ) {
    switch (type) {
      case LibraryType.PROGRAM:
        const doc = await this.findSourceById(type, id);
        const libProgramId = await this.handleLibTypeCopy(
          currentUserId,
          type,
          id,
          doc,
        );

        await this.handleCopyLibChildren(currentUserId, libProgramId, id);
        break;
      // finish copy session/exercise
      default:
        break;
    }
  }

  async copyToLibrary(
    currentUserId: string,
    type: LibraryType,
    id: string,
    isChildren = false,
  ): Promise<void> {
    if (isChildren) await this.commonHandleCopyV2(currentUserId, type, id);
    else await this.commonHandleCopy(currentUserId, type, id);
  }

  async toggleBookmarked(
    currentUserId: string,
    type: LibraryType,
    id: string,
  ): Promise<void> {
    await this.libService
      .getLibService(type)
      .toggleBookmarked(currentUserId, id);
  }

  async getLibChildrenById(
    currentUserId: string,
    docId: string,
    type: LibraryType,
    libChildrenRequest: GetLibChildrenRequest,
  ): Promise<ILibResponse[]> {
    const { limit, startAfter, sorted } = libChildrenRequest;
    const skip = (startAfter - 1) * limit;
    if (type === LibraryType.PROGRAM) return [];
    const libTypeId: string =
      type === LibraryType.SESSION
        ? `${LibraryType.PROGRAM.toLowerCase()}Id`
        : `${LibraryType.SESSION.toLowerCase()}Id`;

    const matchQuery = new Object();
    matchQuery[`${libTypeId}`] = new Types.ObjectId(docId);
    matchQuery['isDeleted'] = false;
    matchQuery['$expr'] = {
      $cond: {
        if: { $eq: ['$createdBy', currentUserId] },
        then: true,
        else: { $eq: ['$shareWith', EShareWith.ALL] },
      },
    };

    const pipeline: any[] = pipelineGetLibrary(matchQuery, skip, limit, {
      order: sorted === SortBy.ASC ? 1 : -1,
    });

    const docs: ILibEntity[] = await this.repository
      .getLibRepository(type)
      .aggregate(pipeline);

    return Promise.all(
      docs.map((e) =>
        this.minorService.generateResponse(currentUserId, type, e),
      ),
    );
  }

  async getProgramDetailById(id: string, userId: string) {
    return this.programService.getProgramById(id, userId);
  }

  async getDetailById(
    currentUserId: string,
    id: string,
    type: LibraryType,
  ): Promise<GetDetailResponse> {
    const response = await this.libService
      .getLibService(type)
      .getDetailById(currentUserId, id);
    return response;
  }
}

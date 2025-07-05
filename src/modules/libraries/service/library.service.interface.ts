import { ExercisesRequestDto } from '../../programs/dtos/exercise/exercises-request.dto';
import { ProgramTotalRequestDto } from '../../programs/dtos/program-total-request.dto';
import { GetDetailResponse } from '../../programs/dtos/program/programs-response.dto';
import { SessionsRequestDto } from '../../programs/dtos/session/sessions-request.dto';
import { GetLibRequestDto } from '../dto/request/get-lib.request.dto';
import { GetLibChildrenRequest } from '../dto/request/get-sessions.req';
import { LibRequestDto } from '../dto/request/lib.request.dto';
import { LibraryTab } from '../enum/library.tab';
import { LibraryType } from '../enum/library.type';
import { ILibResponse } from '../interface/response.interface';

export interface ILibService {
  create(
    currentUserId: string,
    libRequest: LibRequestDto,
    type: LibraryType,
  ): Promise<void>;
  update(
    currentUserId: string,
    libRequest: LibRequestDto,
    type: LibraryType,
    docId: string,
  ): Promise<void>;
  getMany(
    currentUserId: string,
    filterQuery: GetLibRequestDto,
    type: LibraryType,
    tab?: LibraryTab,
  ): Promise<ILibResponse[]>;

  getManyV2(
    currentUserId: string,
    filterQuery: GetLibRequestDto,
    type: LibraryType,
    tab?: LibraryTab,
  ): Promise<ILibResponse[]>;

  getOne(
    currentUserId: string,
    id: string,
    type: LibraryType,
  ): Promise<ILibResponse>;

  getDetailById(
    currentUserId: string,
    id: string,
    type: LibraryType,
  ): Promise<GetDetailResponse>;

  delete(docId: string, type: LibraryType): Promise<void>;

  copyToLibrary(
    currentUserId: string,
    type: LibraryType,
    id: string,
    isChildren?: boolean,
  ): Promise<void>;

  createProgram(
    request: ProgramTotalRequestDto,
    userRoleId: string,
  ): Promise<void>;

  createSession(request: SessionsRequestDto, userRoleId: string): Promise<void>;

  createExercise(
    request: ExercisesRequestDto,
    userRoleId: string,
  ): Promise<void>;

  toggleBookmarked(
    currentUserId: string,
    type: LibraryType,
    id: string,
  ): Promise<void>;

  getLibChildrenById(
    currentUserId: string,
    docId: string,
    type: LibraryType,
    libChildrenRequest: GetLibChildrenRequest,
  ): Promise<ILibResponse[]>;

  getProgramDetailById(id: string, userId: string);
}

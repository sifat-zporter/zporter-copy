import { GetDetailResponse } from '../../../programs/dtos/program/programs-response.dto';
import { GetSessionsByProgramId } from '../../../programs/dtos/session/get-sessions.dto';
import { SessionsRequestDto } from '../../../programs/dtos/session/sessions-request.dto';
import SessionResponseDto from '../../../programs/dtos/session/sessions-response.dto';
import { ILibResponse } from '../../interface/response.interface';
import { ILibEntity } from '../../interface/entity.interface';
import { Program } from '../../../programs/repositories/program/program';

export interface ILibSessionService {
  createManySession(
    requests: SessionsRequestDto[],
    program: Program,
    currentUserId: string,
  ): Promise<void>;

  createSession(request: SessionsRequestDto, userRoleId: string);

  duplicateSession(sessionId: string, currentUserId: string): Promise<void>;

  getSessionById(sessionId: string): Promise<SessionResponseDto>;

  getSessionsByProgramId(
    getSessionsByProgramId: GetSessionsByProgramId,
  ): Promise<SessionResponseDto[]>;

  deleteSession(sessionId: string): Promise<void>;

  validateExistedSession(sessionId: string): Promise<void>;

  getDetailById(
    currentUserId: string,
    sessionId: string,
  ): Promise<GetDetailResponse>;

  getChildrenByProgramId(
    currentUserId: string,
    programId: string,
  ): Promise<ILibResponse[]>;

  softDelete(doc: ILibEntity, docId: string): Promise<void>;
}

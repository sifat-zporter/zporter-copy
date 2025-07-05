import { GetSessionsByProgramId } from '../../dtos/session/get-sessions.dto';
import { SessionsRequestDto } from '../../dtos/session/sessions-request.dto';
import SessionResponseDto from '../../dtos/session/sessions-response.dto';
import { Types } from 'mongoose';
import { Program } from '../../repositories/program/program';

export interface ISessionsService {
  createSessions(
    programSessionsRequestDto: SessionsRequestDto,
    currentUserId: string,
  ): Promise<void>;

  createManySession(
    requests: SessionsRequestDto[],
    currentUserId: string,
    session: any,
    checkValidateHeadline: Record<string, unknown>,
  ): Promise<void>;
  createManySession(
    requests: SessionsRequestDto[],
    program: Program,
    isNewProgram: boolean,
  ): Promise<void>;

  duplicateSession(sessionId: string, currentUserId: string): Promise<void>;

  getSessionById(sessionId: string): Promise<SessionResponseDto>;
  getSessionsByProgramId(
    getSessionsByProgramId: GetSessionsByProgramId,
  ): Promise<SessionResponseDto[]>;

  updateSessions(
    sessionId: string,
    updateSession: SessionsRequestDto,
  ): Promise<void>;

  deleteSession(sessionId: string): Promise<void>;

  validateSessionHeadline(
    headline: string,
    programId: Types.ObjectId,
    programSessionId?: string,
  ): Promise<void>;
  validateExistedSession(sessionId: string): Promise<void>;
  createOrUpdateSessions(sessions: SessionsRequestDto[]): Promise<any>;
}

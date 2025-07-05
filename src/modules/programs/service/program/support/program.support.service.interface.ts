import { Role } from '../../../../diaries/enum/diaries.enum';
import { User } from '../../../../users/repositories/user/user';
import { ProgramsRequestDto } from '../../../dtos/program/programs-request.dto';
import { ProgramResponse } from '../../../dtos/program/programs-response.dto';
import { Program } from '../../../repositories/program/program';

export interface IProgramSupportService {
  generateNewProgram(
    request: ProgramsRequestDto,
    programExists: Program,
    user: User,
    version: number,
    isNewProgram: boolean,
  ): Program;
  generateUserRole(user: User): Role[];

  validateRequestHeadline(
    programId: string,
    request: ProgramsRequestDto,
  ): Promise<void>;
  generateProgramResponse(
    program: Program,
    currentUserId?: string,
  ): Promise<ProgramResponse>;
}

import { Role } from '../../../../diaries/enum/diaries.enum';
import { ProgramsRequestDto } from '../../../../programs/dtos/program/programs-request.dto';
import { ProgramResponse } from '../../../../programs/dtos/program/programs-response.dto';
import { Program } from '../../../../programs/repositories/program/program';
import { User } from '../../../../users/repositories/user/user';
import { ILibEntity } from '../../../interface/entity.interface';

export interface ILibProgramSupportService {
  generateNewProgram(request: ProgramsRequestDto, user: User): Program;
  generateUserRole(user: User): Role[];

  validateRequestHeadline(request: ProgramsRequestDto): Promise<void>;
  generateProgramResponse(
    program: ILibEntity,
    currentUserId?: string,
  ): Promise<ProgramResponse>;
}

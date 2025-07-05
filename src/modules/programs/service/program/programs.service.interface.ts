import { User } from '../../../users/repositories/user/user';
import { GetProgramsDto } from '../../dtos/program/get-programs.dto';
import { ProgramsRequestDto } from '../../dtos/program/programs-request.dto';
import { ProgramResponse } from '../../dtos/program/programs-response.dto';
import { UpsertProgramDto } from '../../dtos/v2/program/upsert-program.dto';

export interface IProgramsService {
  duplicateProgram(programId: string, currentUserId: string): Promise<void>;

  getProgramById(
    programId: string,
    currentUserId?: string,
  ): Promise<ProgramResponse>;
  getProgramByType(
    getProgramsByTypeDto: GetProgramsDto,
  ): Promise<ProgramResponse[]>;

  deleteProgram(programId: string): Promise<void>;

  validateProgramHeadline(headline: string, programId?: string): Promise<void>;

  upsertProgram(program: UpsertProgramDto, userRoleId?: string): Promise<any>;

  createOrUpdateSingleProgramWithSession(
    programDto: ProgramsRequestDto,
    user: User,
  ): Promise<void>;
}

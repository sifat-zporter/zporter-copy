import { GetProgramsDto } from '../../../programs/dtos/program/get-programs.dto';
import { ProgramsRequestDto } from '../../../programs/dtos/program/programs-request.dto';
import {
  GetDetailResponse,
  ProgramResponse,
} from '../../../programs/dtos/program/programs-response.dto';
import { TypeOfPrograms } from '../../../programs/enums/type-of-programs';
import { ILibEntity } from '../../interface/entity.interface';

export interface ILibProgramsService {
  createOrUpdate(
    programDto: ProgramsRequestDto,
    currentUserId: string,
  ): Promise<void>;

  duplicateProgram(programId: string, currentUserId: string): Promise<void>;

  getProgramById(programId: string, userId: string);

  getProgramByType(
    getProgramsByTypeDto: GetProgramsDto,
  ): Promise<ProgramResponse[]>;

  validateProgramHeadline(
    headline: string,
    programType: TypeOfPrograms,
    programId?: string,
  ): Promise<void>;

  toggleBookmarked(currentUserId: string, id: string): Promise<void>;

  softDelete(doc: ILibEntity, docId: string): Promise<void>;
}

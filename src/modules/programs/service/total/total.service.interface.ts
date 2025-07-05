import { ProgramTotalRequestDto } from '../../dtos/program-total-request.dto';
import { GetDetailResponse } from '../../dtos/program/programs-response.dto';
import { TargetType } from '../../enums/target.type';
import { ProgramsRequestDto } from '../../dtos/program/programs-request.dto';
import { User } from '../../../users/repositories/user/user';
import { ExercisesRequestDto } from '../../dtos/exercise/exercises-request.dto';
import { SessionsRequestDto } from '../../dtos/session/sessions-request.dto';

export interface ITotalService {
  updateProgram(
    request: ProgramTotalRequestDto,
    currentUserId: string,
  ): Promise<void>;

  createAndPublishProgram(
    programDto: ProgramsRequestDto,
    user: User,
  ): Promise<void>;

  getDetailById(id: string, type: TargetType): Promise<GetDetailResponse>;

  createSession(userRoleId: string, request: SessionsRequestDto);

  createExercise(userRoleId: string, request: ExercisesRequestDto);
}

export interface ITotalCommonService {
  getDetailById(id: string): Promise<GetDetailResponse>;
}

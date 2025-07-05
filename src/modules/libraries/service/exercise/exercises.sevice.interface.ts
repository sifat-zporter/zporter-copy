import { ExercisesRequestDto } from '../../../programs/dtos/exercise/exercises-request.dto';
import { ExerciseResponseDto } from '../../../programs/dtos/exercise/exercises-response.dto';
import { GetExercisesDto } from '../../../programs/dtos/exercise/get-exercises.dto';
import { GetDetailResponse } from '../../../programs/dtos/program/programs-response.dto';
import { SessionsRequestDto } from '../../../programs/dtos/session/sessions-request.dto';
import { ILibEntity } from '../../interface/entity.interface';

export interface ILibExercisesService {
  createManyExercise(
    request: SessionsRequestDto,
    currentUserId: string,
  ): Promise<void>;

  duplicateExercise(exerciseId: string, currentUserId: string): Promise<void>;

  getExerciseById(programExerciseId: string): Promise<ExerciseResponseDto>;

  getExercisesBySessionId(
    getExerciseBySessionId: GetExercisesDto,
  ): Promise<ExerciseResponseDto[]>;

  deleteExercise(exerciseId: string): Promise<void>;

  getDetailById(currentUserId: string, id: string): Promise<GetDetailResponse>;

  softDelete(doc: ILibEntity, docId: string): Promise<void>;
}

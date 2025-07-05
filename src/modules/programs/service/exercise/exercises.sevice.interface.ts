import { ExercisesRequestDto } from '../../dtos/exercise/exercises-request.dto';
import { ExerciseResponseDto } from '../../dtos/exercise/exercises-response.dto';
import { GetExercisesDto } from '../../dtos/exercise/get-exercises.dto';
import { Session } from '../../repositories/session/session';

export interface IExercisesService {
  createManyExercise(
    requests: ExercisesRequestDto[],
    sessionProgram: Session,
    isNewProgram: boolean,
  ): Promise<void>;

  duplicateExercise(exerciseId: string, currentUserId: string): Promise<void>;

  getExerciseById(programExerciseId: string): Promise<ExerciseResponseDto>;
  getExercisesBySessionId(
    getExerciseBySessionId: GetExercisesDto,
  ): Promise<ExerciseResponseDto[]>;

  deleteExercise(exerciseId: string): Promise<void>;

  validateHeadline(
    headline: string,
    sessionId: string,
    exerciseId?: string,
  ): Promise<void>;
  createOrUpdateExercises(
    exercise: ExercisesRequestDto[],
    currentUserId?: string,
  ): Promise<any>;
}

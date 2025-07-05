import { ExecutionRequestDto } from '../../dtos/user-exercise/request/done-exercise-request.dto';
import { GetUserExerciseRequest } from '../../dtos/user-exercise/request/get-user-exercise.request';
import { GetUserSessionRequest } from '../../dtos/user-exercise/request/get-user-session.request';
import { UserExerciseResponse } from '../../dtos/user-exercise/response/user-exercise.response';
import { UserSessionResponse } from '../../dtos/user-exercise/response/user-session.response';
import { RunExerciseResponseDto } from '../../dtos/user-exercise/user-exercise-response.dto';
import { ProgressStatus } from '../../enums/progress.status';
import { UserExecution } from '../../repositories/user-exercise/user-execution';
export interface IUserExercisesService {
  runExercise(
    currentUserId: string,
    doneExerciseRequest: ExecutionRequestDto,
  ): Promise<RunExerciseResponseDto>;

  getSession(
    currentUserId: string,
    getRequest: GetUserSessionRequest,
  ): Promise<UserSessionResponse[]>;

  getExercise(
    currentUserId: string,
    getRequest: GetUserExerciseRequest,
  ): Promise<UserExerciseResponse[]>;

  getProgressStatus(userExercise: UserExecution): Promise<ProgressStatus>;

  clearExecution(programId: string, currentUserId: string): Promise<void>;

  toggleBookmarkedProgram(
    currentUserId: string,
    programId: string,
  ): Promise<void>;

  activateProgram(programId: string, userId: string): Promise<void>;
}

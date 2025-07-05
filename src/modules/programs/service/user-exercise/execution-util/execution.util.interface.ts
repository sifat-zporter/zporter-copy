import { ExecutionRequestDto } from '../../../dtos/user-exercise/request/done-exercise-request.dto';
import { Types } from 'mongoose';
import { ProgressStatus } from '../../../enums/progress.status';
import { RunExerciseResponseDto } from '../../../dtos/user-exercise/user-exercise-response.dto';

export interface IExecutionUtil {
  validateAlreadyDone(
    currentUserId: string,
    doneExerciseRequest: ExecutionRequestDto,
  ): Promise<void>;
  validateProgress(
    sessionId: Types.ObjectId,
    request: ExecutionRequestDto,
    currentUserId: string,
  ): Promise<void>;

  updateProgressExercise(
    currentUserId: string,
    programId: Types.ObjectId,
    sessionsId: Types.ObjectId,
    exerciseId: Types.ObjectId,
  ): Promise<void>;

  updateProgressSession(
    currentUserId: string,
    sessionId: Types.ObjectId,
  ): Promise<ProgressStatus>;

  updateProgressProgram(
    currentUserId: string,
    programId: Types.ObjectId,
  ): Promise<ProgressStatus>;

  validateDone(
    programStatus: ProgressStatus,
    sessionStatus: ProgressStatus,
    nextSessionId: string,
  ): Promise<RunExerciseResponseDto>;
}

import { UserInfoDto } from '../../../../../common/constants/common.constant';
import { UserExerciseResponse } from '../../../dtos/user-exercise/response/user-exercise.response';
import { UserProgramResponse } from '../../../dtos/user-exercise/response/user-program.response';
import { UserSessionResponse } from '../../../dtos/user-exercise/response/user-session.response';
import { WrapUserExerciseResponse } from '../../../dtos/user-exercise/response/wrap.user-exercise.response';
import { Exercise } from '../../../repositories/exercise/exercise';
import { Program } from '../../../repositories/program/program';
import { Session } from '../../../repositories/session/session';
import { UserExecution } from '../../../repositories/user-exercise/user-execution';

export interface IResponseUtil {
  generateExerciseResponse(
    currentUserId: string,
    exercise: Exercise,
    session: Session,
    userExercise: UserExecution,
    user?: UserInfoDto,
  ): Promise<UserExerciseResponse>;

  generateSessionResponse(
    currentUserId: string,
    session: Session,
    userSession: UserExecution,
    user?: UserInfoDto,
  ): Promise<UserSessionResponse>;

  generateUserProgramResponse(
    currentUserId: string,
    program: Program,
    doneProgram?: UserExecution,
    userSessionResponses?: UserSessionResponse[],
  ): Promise<UserProgramResponse>;
}

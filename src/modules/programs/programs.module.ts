import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DateUtil } from '../../utils/date-util';
import { ObjectMapper } from '../../utils/objectMapper';
import { ClubModule } from '../clubs/clubs.module';
import { UsersModule } from '../users/users.module';
import { ExercisesControllers } from './controller/cms/program-exercises.controller';
import { SessionsControllers } from './controller/cms/program-sessions.controller';
import { ProgramsControllers } from './controller/cms/programs.controller';
import { UserExercisesControllers } from './controller/user-exercises.controller';
import { VotingController } from './controller/voting.controller';
import { ExercisesRepository } from './repositories/exercise/exercises.repository';
import { ProgramsRepository } from './repositories/program/programs.repository';
import { SessionsRepository } from './repositories/session/sessions.repository';
import {
  USER_EXERCISES_MODEL,
  UserExerciseSchema,
} from './repositories/user-exercise/user-execution';
import { UserExerciseRepository } from './repositories/user-exercise/user-execution.repository';
import { ExercisesService } from './service/exercise/exercises.service';
import { ProgramsService } from './service/program/programs.service';
import { RatingService } from './service/rating/rating.service';
import { SessionsService } from './service/session/sessions.service';
import { ResponseUtil } from './service/user-exercise/response-util/response.util';
import { UserExercisesService } from './service/user-exercise/user-exercises.service';
import { PROGRAMS_MODEL, ProgramsSchema } from './repositories/program/program';
import { ProgramSupportService } from './service/program/support/program.support.service';
import { NewProgramController } from './controller/coach/new.program.controller';
import { TotalService } from './service/total/total.service';
import { SessionSupportService } from './service/session/support/session.support.service';
import { ExerciseSupportService } from './service/exercise/support/exercise.support.service';
import {
  PROGRAM_SESSIONS_MODEL,
  SessionSchema,
} from './repositories/session/session';
import {
  ExerciseSchema,
  PROGRAM_EXERCISES_MODEL,
} from './repositories/exercise/exercise';
import { ExecutionUtilService } from './service/user-exercise/execution-util/execution.util.service';
import { ProgCommentService } from './service/comment/comment.service';
import { UserService } from '../users/service/user/user.service';
import { CommentsModule } from '../comments/comments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PROGRAMS_MODEL,
        schema: ProgramsSchema,
      },
      {
        name: PROGRAM_SESSIONS_MODEL,
        schema: SessionSchema,
      },
      {
        name: PROGRAM_EXERCISES_MODEL,
        schema: ExerciseSchema,
      },
      {
        name: USER_EXERCISES_MODEL,
        schema: UserExerciseSchema,
      },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => ClubModule),
    forwardRef(() => CommentsModule),
  ],
  controllers: [
    ProgramsControllers,
    SessionsControllers,
    ExercisesControllers,
    UserExercisesControllers,
    VotingController,
    NewProgramController,
  ],
  providers: [
    ProgramsService,
    ProgramSupportService,
    ProgramsRepository,
    SessionsService,
    SessionSupportService,
    SessionsRepository,
    ExercisesService,
    ExerciseSupportService,
    ExercisesRepository,
    UserExercisesService,
    UserExerciseRepository,
    ObjectMapper,
    DateUtil,
    ResponseUtil,
    RatingService,
    TotalService,
    ExecutionUtilService,
    ProgCommentService,
    UserService,
  ],
  exports: [
    ProgramsRepository,
    SessionsRepository,
    ExercisesRepository,
    ProgramsService,
    SessionsService,
    ExercisesService,
    UserExercisesService,
    TotalService,
  ],
})
export class ProgramsModule {}

import { Module, forwardRef } from '@nestjs/common';
import { ProgramsModule } from '../programs/programs.module';
import { LibraryController } from './controller/library.controller';
import { LibraryService } from './service/library.service';
import { LibFactoryRepository } from './repository/lib-factory.repository';
import { AbstractModule } from '../abstract/abstract.module';
import { MongooseModule } from '@nestjs/mongoose';
// import { ProgramsSchema } from '../programs/schemas/programs.schema';
import { LibraryModel } from './enum/library.model';
import { LibProgramRepository } from './repository/program/lib.program.repository';
import { LibSessionRepository } from './repository/session/lib.session.repository';
import { LibExerciseRepository } from './repository/exercise/lib.exercise.repository';
import { LibMinorService } from './service/lib.minor.service';
import { LibValidateService } from './service/lib.validate.service';
import { ProgramsSchema } from '../programs/repositories/program/program';
import { SessionSchema } from '../programs/repositories/session/session';
import { ExerciseSchema } from '../programs/repositories/exercise/exercise';
import { UsersModule } from '../users/users.module';
import { LibProgramsService } from './service/program/programs.service';
import { LibProgramSupportService } from './service/program/support/program.support.service';
import { LibSessionsService } from './service/session/sessions.service';
import { LibSessionSupportService } from './service/session/support/session.support.service';
import { LibExercisesService } from './service/exercise/exercises.service';
import { LibExerciseSupportService } from './service/exercise/support/exercise.support.service';
import { LibFactoryService } from './service/lib-factory.service';
import { LibRatingService } from './service/voting/lib.rating.service';
import { LibVotingController } from './controller/rating.controller';

@Module({
  controllers: [LibraryController, LibVotingController],

  providers: [
    LibraryService,
    LibMinorService,
    LibValidateService,
    LibFactoryRepository,
    LibProgramRepository,
    LibSessionRepository,
    LibExerciseRepository,
    LibraryController,
    LibProgramsService,
    LibProgramSupportService,
    LibSessionsService,
    LibSessionSupportService,
    LibExercisesService,
    LibExerciseSupportService,
    LibFactoryService,
    LibRatingService,
  ],
  imports: [
    forwardRef(() => ProgramsModule),
    AbstractModule,
    MongooseModule.forFeature([
      {
        name: LibraryModel.PROGRAM,
        schema: ProgramsSchema,
      },
      {
        name: LibraryModel.SESSION,
        schema: SessionSchema,
      },
      {
        name: LibraryModel.EXERCISE,
        schema: ExerciseSchema,
      },
    ]),
    UsersModule,
    forwardRef(() => ProgramsModule),
  ],
  exports: [
    LibFactoryRepository,
    LibProgramsService,
    LibSessionsService,
    LibExercisesService,
  ],
})
export class LibraryModule {}

import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { LibraryType } from '../enum/library.type';
import { LibProgramsService } from './program/programs.service';
import { LibSessionsService } from './session/sessions.service';
import { LibExercisesService } from './exercise/exercises.service';
import { ILibFactoryRepository } from '../repository/lib-factory.repository.interface';
import { ILibFactoryService } from './lib-factory.service.interface';

@Injectable()
export class LibFactoryService implements ILibFactoryService {
  constructor(
    @Inject(forwardRef(() => LibProgramsService))
    public libProgramService: LibProgramsService,
    @Inject(forwardRef(() => LibSessionsService))
    public libSessionService: LibSessionsService,
    @Inject(LibExercisesService)
    public libExerciseService: LibExercisesService,
  ) {}

  public getLibService(type: LibraryType) {
    switch (type) {
      case LibraryType.PROGRAM:
        return this.libProgramService;
      case LibraryType.SESSION:
        return this.libSessionService;
      case LibraryType.EXERCISE:
        return this.libExerciseService;
    }
  }
}

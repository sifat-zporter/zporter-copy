import { Inject, Injectable } from '@nestjs/common';
import { INewCommonRepository } from '../../abstract/interface/new-common-repository.interface';
import { LibraryType } from '../enum/library.type';
import { ILibEntity } from '../interface/entity.interface';
import { ILibRepository } from '../interface/repository.interface';
import { LibExerciseRepository } from './exercise/lib.exercise.repository';
import { ILibFactoryRepository } from './lib-factory.repository.interface';
import { LibProgramRepository } from './program/lib.program.repository';
import { LibSessionRepository } from './session/lib.session.repository';

@Injectable()
export class LibFactoryRepository implements ILibFactoryRepository {
  constructor(
    @Inject(LibProgramRepository)
    public libProgramRepository: LibProgramRepository,
    @Inject(LibSessionRepository)
    public libSessionRepository: LibSessionRepository,
    @Inject(LibExerciseRepository)
    public libExerciseRepository: LibExerciseRepository,
  ) {}

  public getLibRepository(type: LibraryType): ILibRepository {
    switch (type) {
      case LibraryType.PROGRAM:
        return this.libProgramRepository;
      case LibraryType.SESSION:
        return this.libSessionRepository;
      case LibraryType.EXERCISE:
        return this.libExerciseRepository;
    }
  }

  public getSourceRepository(
    type: LibraryType,
  ): INewCommonRepository<ILibEntity> {
    switch (type) {
      case LibraryType.PROGRAM:
        return this.libProgramRepository.sourceRepository;
      case LibraryType.SESSION:
        return this.libSessionRepository.sourceRepository;
      case LibraryType.EXERCISE:
        return this.libExerciseRepository.sourceRepository;
    }
  }

  async getOne(currentUserId: string, id: string, type: LibraryType) {}
}

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { DateUtil } from '../../../../utils/date-util';
import { INewCommonRepository } from '../../../abstract/interface/new-common-repository.interface';
import { ILibEntity } from '../../../libraries/interface/entity.interface';
import { UsersService } from '../../../users/v1/users.service';
import { StarRange } from '../../constant/star.range';
import { TargetType } from '../../enums/target.type';
import { ExercisesRepository } from '../../repositories/exercise/exercises.repository';
import { IExercisesRepository } from '../../repositories/exercise/exercises.repository.interface';
import { ProgramsRepository } from '../../repositories/program/programs.repository';
import { IProgramsRepository } from '../../repositories/program/programs.repository.interface';
import { Rating } from '../../repositories/rating/rating';
import { SessionsRepository } from '../../repositories/session/sessions.repository';
import { ISessionRepository } from '../../repositories/session/sessions.repository.interface';
import { IRatingService } from './rating.service.interface';

@Injectable()
export class RatingService implements IRatingService {
  constructor(
    @Inject(ProgramsRepository)
    private programRepository: IProgramsRepository,
    @Inject(SessionsRepository)
    private sessionsRepository: ISessionRepository,
    @Inject(ExercisesRepository)
    private exerciseRepository: IExercisesRepository,
    @Inject(UsersService)
    private userService: UsersService,
  ) {}

  getRepository(type: TargetType): INewCommonRepository<ILibEntity> {
    switch (type) {
      case TargetType.PROGRAM:
        return this.programRepository;
      case TargetType.SESSION:
        return this.sessionsRepository;
      case TargetType.EXERCISE:
        return this.exerciseRepository;
    }
  }

  async voteDoc(
    currentUserId: string,
    type: TargetType,
    docId: string,
    star: number,
  ): Promise<void> {
    await this.userService.validateUserId(currentUserId);
    if (!StarRange.includes(star)) {
      throw new BadRequestException(
        ResponseMessage.Program.RATING_NOT_IN_RANGE,
      );
    }

    const doc: ILibEntity = await this.getRepository(type).customedFindOne(
      {
        _id: docId,
      },
      {
        avgStar: 1,
        ratings: 1,
      },
    );

    if (!doc) {
      throw new BadRequestException(ResponseMessage.Program.NOT_FOUND);
    }

    const newRatingList: Rating[] = this.addNewVoting(currentUserId, doc, star);

    const updateDoc: ILibEntity = doc;
    updateDoc.avgStar = this.calculateAvgRating(newRatingList);
    updateDoc.ratings = newRatingList;

    await this.getRepository(type).createOrUpdate(updateDoc, {
      _id: docId,
    });
  }

  calculateAvgRating(ratingList: Rating[]): number {
    const avgStar: number = ratingList.reduce(
      (prev, curr) => prev + curr.star / ratingList.length,
      0,
    );
    return Math.round(avgStar * 2) / 2;
  }

  addNewVoting(currentUserId: string, doc: ILibEntity, star: number): Rating[] {
    const filterList: Rating[] = doc?.ratings
      ? doc.ratings.filter((e: Rating) => e.createdBy !== currentUserId)
      : [];
    const newRating: Rating = {
      createdBy: currentUserId,
      star: star,
      createdAt: new DateUtil().getNowDate(),
    };
    return [...filterList, newRating];
  }
}

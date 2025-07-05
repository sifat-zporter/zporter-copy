import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { TargetType } from '../../../programs/enums/target.type';
import { ILibRatingService } from './lib.rating.service.interface';
import { LibProgramRepository } from '../../repository/program/lib.program.repository';
import { LibSessionRepository } from '../../repository/session/lib.session.repository';
import { LibExerciseRepository } from '../../repository/exercise/lib.exercise.repository';
import { ILibRepository } from '../../interface/repository.interface';
import { UsersService } from '../../../users/v1/users.service';
import { INewCommonRepository } from '../../../abstract/interface/new-common-repository.interface';
import { ILibEntity } from '../../interface/entity.interface';
import { Rating } from '../../../programs/repositories/rating/rating';
import { DateUtil } from '../../../../utils/date-util';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { StarRange } from '../../../programs/constant/star.range';

@Injectable()
export class LibRatingService implements ILibRatingService {
  constructor(
    @Inject(LibProgramRepository)
    private programRepository: ILibRepository,
    @Inject(LibSessionRepository)
    private sessionsRepository: ILibRepository,
    @Inject(LibExerciseRepository)
    private exerciseRepository: ILibRepository,
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

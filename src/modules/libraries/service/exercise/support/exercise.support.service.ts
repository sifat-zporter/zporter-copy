import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ResponseMessage } from '../../../../../common/constants/common.constant';
import { AbstractService } from '../../../../abstract/abstract.service';
import { Role } from '../../../../diaries/enum/diaries.enum';
import { ILibFactoryRepository } from '../../../repository/lib-factory.repository.interface';
import { LibFactoryRepository } from '../../../repository/lib-factory.repository';
import { ExercisesRequestDto } from '../../../../programs/dtos/exercise/exercises-request.dto';
import { Exercise } from '../../../../programs/repositories/exercise/exercise';
import { LibraryType } from '../../../enum/library.type';
import { ILibEntity } from '../../../interface/entity.interface';
import { TypeOfPrograms } from '../../../../programs/enums/type-of-programs';
import { ExerciseResponseDto } from '../../../../programs/dtos/exercise/exercises-response.dto';
import { MediaDto } from '../../../../diaries/dto/diary.dto';
import { MediaUtil } from '../../../../../utils/media-util';
import { MediaSource } from '../../../../programs/repositories/program/media-source';

@Injectable()
export class LibExerciseSupportService extends AbstractService<ILibFactoryRepository> {
  constructor(
    @Inject(LibFactoryRepository)
    private exerciseRepository: ILibFactoryRepository,
  ) {
    super(exerciseRepository);
  }

  validateHeadline(requests: ExercisesRequestDto[]) {
    //# check unique headline in sesson list
    const listHeadline: string[] = [];
    for (let i = 0; i < requests.length; i++) {
      const currentHeadline: string = requests[i].headline;
      if (listHeadline.includes(currentHeadline)) {
        throw new BadRequestException(
          `Exercise: '${currentHeadline}' - ${ResponseMessage.Program.DUPLICATED_HEADLINE}`,
        );
      }

      listHeadline.push(requests[i].headline);
    }
  }

  generateSingleExercise(request: ExercisesRequestDto, currentUserId: string) {
    const deleted: boolean = request?.isDeleted || false;
    const exercise: Exercise = {
      _id: new Types.ObjectId(request.id),
      idRoot: null,
      index: 0,
      createdBy: currentUserId,
      sessionId: request.sessionId,
      headline: request?.headline || '',
      ingressText: request?.ingressText || '',
      media: request.media.length
        ? request.media.map((media) => {
            const mediaDto: MediaDto = new MediaUtil().processThumbnailVideo(
              media,
            );
            return new MediaSource({
              source: mediaDto.source,
              thumbnail: mediaDto.thumbnail,
              type: mediaDto.type,
              uniqueKey: mediaDto.uniqueKey,
              url: mediaDto.url,
            });
          })
        : [],
      description: request?.description || '',
      minParticipants: request?.minParticipants || '',
      timeRun: request?.timeRun || '',
      tags: request?.tags || [],
      order: request?.order || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: deleted,
      deletedAt: deleted == true ? new Date() : null,
      avgStar: 0,
      ratings: [],
      ageFrom: request?.ageFrom || 0,
      ageTo: request?.ageTo || 100,
      location: request?.location || 'Field',
      targetGroup: request?.targetGroup || Role.ALL,
      mainCategory: request?.mainCategory || TypeOfPrograms.OTHER,
      collections: request?.collections || [],
      shareWith: request?.shareWith || 'All',
      // day: 0,
      technics: request?.technics || 0,
      tactics: request?.tactics || 0,
      physics: request?.physics || 0,
      mental: request?.mental || 0,
      physicallyStrain: request?.physicallyStrain || 0,

      isPublic: request?.isPublic ?? true,
      bookmarkUserIds: [],
    };
    return exercise;
  }

  /**
   * Because these things are optional so I must have (?.) to check existed.
   * TODO: need to find the better solution for these
   */
  generateExercises(
    requests: ExercisesRequestDto[],
    currentUserId: string,
  ): Exercise[] {
    const result: Exercise[] = requests.map((request) => {
      const deleted: boolean = request?.isDeleted || false;

      const exercise: Exercise = {
        _id: new Types.ObjectId(request.id),
        idRoot: null,
        index: 0,
        createdBy: currentUserId,
        sessionId: request.sessionId,
        headline: request?.headline || '',
        ingressText: request?.ingressText || '',
        media: request.media.length
          ? request.media.map((media) => {
              const mediaDto: MediaDto = new MediaUtil().processThumbnailVideo(
                media,
              );
              return new MediaSource({
                source: mediaDto.source,
                thumbnail: mediaDto.thumbnail,
                type: mediaDto.type,
                uniqueKey: mediaDto.uniqueKey,
                url: mediaDto.url,
              });
            })
          : [],
        description: request?.description || '',
        minParticipants: request?.minParticipants || '',
        timeRun: request?.timeRun || '',
        tags: request?.tags || [],
        order: request?.order || 0,
        createdAt: request.createdAt || new Date(),
        updatedAt: request.createdAt || new Date(),
        isDeleted: deleted,
        deletedAt: deleted == true ? new Date() : null,
        avgStar: 0,
        ratings: [],
        ageFrom: request?.ageFrom || 0,
        ageTo: request?.ageTo || 100,
        location: request?.location || 'Field',
        targetGroup: request?.targetGroup || Role.ALL,
        mainCategory: request?.mainCategory || TypeOfPrograms.OTHER,
        collections: request?.collections || [],
        shareWith: request?.shareWith || 'All',
        // day: 0,
        technics: request?.technics || 0,
        tactics: request?.tactics || 0,
        physics: request?.physics || 0,
        mental: request?.mental || 0,
        physicallyStrain: request?.physicallyStrain || 0,

        isPublic: request?.isPublic ?? true,
        bookmarkUserIds: [],
      };
      return exercise;
    });
    return result;
  }

  generateExerciseResponse(exercise: ILibEntity): ExerciseResponseDto {
    const res: ExerciseResponseDto = {
      ...this.objectMapper.convertValue(exercise, new ExerciseResponseDto()),
      id: exercise._id.toString(),
      createdAt: +this.dateUtil.convertDateToFormat(exercise.createdAt, 'x'),
      updatedAt: +this.dateUtil.convertDateToFormat(exercise.updatedAt, 'x'),
    };
    return res;
  }
}

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResponseMessage } from '../../../../../common/constants/common.constant';
import { mappingUserInfoById } from '../../../../../helpers/mapping-user-info';
import { AbstractService } from '../../../../abstract/abstract.service';
import { MediaDto } from '../../../../diaries/dto/diary.dto';
import { Types } from 'mongoose';
import { LibSessionRepository } from '../../../repository/session/lib.session.repository';
import { SessionsRequestDto } from '../../../../programs/dtos/session/sessions-request.dto';
import { Session } from '../../../../programs/repositories/session/session';
import { TypeOfPrograms } from '../../../../programs/enums/type-of-programs';
import SessionResponseDto from '../../../../programs/dtos/session/sessions-response.dto';
import { ISessionRepository } from '../../../../programs/repositories/session/sessions.repository.interface';
import { ILibEntity } from '../../../interface/entity.interface';
import { MediaUtil } from '../../../../../utils/media-util';
import { MediaSource } from '../../../../programs/repositories/program/media-source';
import { convertAgeToString } from '../../../../../utils/convert-age-to-string';

@Injectable()
export class LibSessionSupportService extends AbstractService<ISessionRepository> {
  constructor(
    @Inject(LibSessionRepository)
    private sessionRepo: ISessionRepository,
  ) {
    super(sessionRepo);
  }
  validateHeadline(requests: SessionsRequestDto[]) {
    //# check unique headline in sesson list
    const listHeadline: string[] = [];
    for (let i = 0; i < requests.length; i++) {
      const currentHeadline: string = requests[i].headline;
      if (listHeadline.includes(currentHeadline)) {
        throw new BadRequestException(
          `Session: '${currentHeadline}' - ${ResponseMessage.Program.DUPLICATED_HEADLINE}`,
        );
      }

      listHeadline.push(requests[i].headline);
    }
  }

  /**
   * Because these things are optional so I must have (?.) to check existed.
   * TODO: need to find the better solution for these
   */
  generateSession(request: SessionsRequestDto, currentUserId: string): Session {
    const deleted: boolean = request?.isDeleted || false;

    const session: Session = {
      _id: new Types.ObjectId(request.id),
      idRoot: null,
      index: 0,
      createdBy: currentUserId,
      programId: request.programId,
      headline: request?.headline || '',
      ingressText: request?.ingressText || '',
      description: request?.description || '',
      minParticipants: request?.minParticipants || '2',
      shareWith: request?.shareWith || 'All',
      ageFrom: request?.ageFrom || 0,
      ageTo: request?.ageTo || 100,
      targetGroup: request?.targetGroup || '',

      media: request?.media?.length
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

      timeRun: request?.timeRun || '',
      tags: request?.tags || [],
      order: request?.order || 0,
      createdAt: request.createdAt || new Date(),
      updatedAt: request.createdAt || new Date(),
      isDeleted: deleted,
      deletedAt: deleted == true ? new Date() : null,
      avgStar: 0,
      ratings: [],

      technics: request?.technics || 0,
      tactics: request?.tactics || 0,
      physics: request?.physics || 0,
      mental: request?.mental || 0,

      day: request?.day || 0,

      physicallyStrain: request?.physicallyStrain || 0,

      location: request?.location || 'Field',

      mainCategory: request?.mainCategory || TypeOfPrograms.OTHER,
      collections: request?.collections || [],
      isPublic: request?.isPublic ?? true,
      bookmarkUserIds: [],
    };
    return session;
  }

  async generateSessionResponse(
    session: ILibEntity,
  ): Promise<SessionResponseDto> {
    const user = await mappingUserInfoById(session.createdBy);
    const sessionResponse: SessionResponseDto =
      this.objectMapper.convertValueCheckType(
        session,
        new SessionResponseDto(),
        {
          media: session.media.map((e) => {
            const mediaDto: MediaDto = {
              source: e.source,
              thumbnail: e.thumbnail,
              type: e.type,
              uniqueKey: e.uniqueKey,
              url: e.url,
            };
            return mediaDto;
          }),
          fullname: user.fullName,
          birthCountry: user.birthCountry,
          city: user.city,
          clubName: user.clubName,
          username: user.username,
          userType: user.type,
          createdBy: user.userId,
          id: session._id.toString(),
          faceImage: user.faceImage,
          bioUrl: user.bioUrl,
          country: user.birthCountry.alpha2Code,

          createdAt: +this.dateUtil.convertDateToFormat(session.createdAt, 'x'),
          updatedAt: +this.dateUtil.convertDateToFormat(session.updatedAt, 'x'),
        },
      );

    return {
      ...sessionResponse,
      ageFrom: convertAgeToString(parseInt(sessionResponse.ageFrom)),
      ageTo: convertAgeToString(parseInt(sessionResponse.ageTo)),
    };
  }
}

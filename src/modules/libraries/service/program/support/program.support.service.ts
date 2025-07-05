import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResponseMessage } from '../../../../../common/constants/common.constant';
import { mappingUserInfoById } from '../../../../../helpers/mapping-user-info';
import { MediaUtil } from '../../../../../utils/media-util';
import { AbstractService } from '../../../../abstract/abstract.service';
import { MediaDto } from '../../../../diaries/dto/diary.dto';
import { Role } from '../../../../diaries/enum/diaries.enum';
import { UserTypes } from '../../../../users/enum/user-types.enum';
import { User } from '../../../../users/repositories/user/user';
import { ILibProgramSupportService } from './program.support.service.interface';
import { ProgramsRequestDto } from '../../../../programs/dtos/program/programs-request.dto';
import { Program } from '../../../../programs/repositories/program/program';
import { MediaSource } from '../../../../programs/repositories/program/media-source';
import { ProgramResponse } from '../../../../programs/dtos/program/programs-response.dto';
import { TypeOfPrograms } from '../../../../programs/enums/type-of-programs';
import { LibFactoryRepository } from '../../../repository/lib-factory.repository';
import { ILibFactoryRepository } from '../../../repository/lib-factory.repository.interface';
import { LibraryType } from '../../../enum/library.type';
import { ILibEntity } from '../../../interface/entity.interface';
import { LibRequestDto } from '../../../dto/request/lib.request.dto';
import { convertAgeToString } from '../../../../../utils/convert-age-to-string';
import { Types } from 'mongoose';

@Injectable()
export class LibProgramSupportService
  extends AbstractService<ILibFactoryRepository>
  implements ILibProgramSupportService
{
  constructor(
    @Inject(LibFactoryRepository)
    private _repository: ILibFactoryRepository,
  ) {
    super(_repository);
  }

  /**
   * Because these things are optional so I must have (?.) to check existed.
   * TODO: need to find the better solution for these
   */
  generateNewProgram(request: ProgramsRequestDto, user: User): Program {
    const deleted: boolean = request?.isDeleted || false;
    // const now: number = new DateUtil().getNowTimeInMilisecond();
    const program: Program = {
      _id: new Types.ObjectId(request.id),
      idRoot: null,
      index: 0,
      createdBy: user.userId,
      headline: request?.headline || '',
      ingressText: request?.ingressText || '',
      description: request?.description || '',
      media:
        request?.media?.length > 0
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
      minParticipants: request?.minParticipants || '2',
      ageFrom: +request?.ageFrom || 0,
      ageTo: +request?.ageTo || 100,
      timeRun: request?.timeRun || '',
      location: request?.location || 'Field',
      targetGroup: request?.targetGroup || Role.ALL,
      tags: request?.tags || [],
      mainCategory: request?.mainCategory || TypeOfPrograms.OTHER,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: deleted,
      deletedAt: deleted == true ? new Date() : null,
      fullname:
        ((user?.profile?.firstName as string) || 'Zporter') +
        ' ' +
        ((user?.profile?.lastName as string) || 'Anonymous'),
      username: user.username,
      birthCountry: user?.profile?.birthCountry,
      country: user?.profile?.birthCountry.name,
      city: user?.profile?.city,
      clubId:
        user.type == UserTypes.PLAYER
          ? user.playerCareer.clubId
          : user.coachCareer.clubId,
      userType: user.type,
      birthYear: Number(user.profile.birthDay.substring(0, 4)),
      role: this.generateUserRole(user),
      numberExecuted: 0,
      avgStar: 0,
      ratings: [],
      isPublic: request?.isPublic ?? true,
      version: 1,
      collections: request?.collections || [],
      shareWith: request?.shareWith || 'All',
      bookmarkUserIds: [],
    };

    return program;
  }

  generateUserRole(user: User): Role[] {
    const roles: string[] = user.playerCareer?.favoriteRoles || [];
    if (!roles.length) {
      return [Role.ALL];
    }

    const result: Role[] = [];
    roles.forEach((role) => {
      if (['CB', 'RB', 'LB'].includes(role)) {
        result.push(Role.DEFENDERS);
      }
      if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(role)) {
        result.push(Role.MIDFIELDERS);
      }
      if (['CF', 'ST', 'RW', 'LW'].includes(role)) {
        result.push(Role.FORWARDS);
      }
    });
    result.push(Role.ALL);
    return result.concat(roles.map((e) => e as Role));
  }

  async validateRequestHeadline(request: ProgramsRequestDto): Promise<void> {
    const program: ILibEntity = await this.repository
      .getLibRepository(LibraryType.PROGRAM)
      .customedFindOne(
        {
          headline: request.headline,
          mainCategory: request.mainCategory,
          isDeleted: false,
        },
        {
          _id: 1,
        },
      );

    if (program && request.id.toString() !== program._id.toString()) {
      throw new BadRequestException(
        `Program: '${request.headline}' - ${ResponseMessage.Program.DUPLICATED_HEADLINE}`,
      );
    }

    const sessionHeadlines: string[] = [];
    request.sessions.map((session) => {
      const exercisesHeadlines: string[] = [];
      session.exercises.map((exercise) => {
        // validate duplicate headline exersice
        if (exercisesHeadlines.includes(exercise.headline)) {
          throw new BadRequestException(
            `Exercises: '${exercise.headline}' - ${ResponseMessage.Program.DUPLICATED_HEADLINE}`,
          );
        }

        exercisesHeadlines.push(exercise.headline);
      });

      // validate duplicate headline session
      if (sessionHeadlines.includes(session.headline)) {
        throw new BadRequestException(
          `Session: '${session.headline}' - ${ResponseMessage.Program.DUPLICATED_HEADLINE}`,
        );
      }

      sessionHeadlines.push(session.headline);
    });
  }

  async generateProgramResponse(
    program: Program,
    currentUserId?: string,
  ): Promise<ProgramResponse> {
    const user = await mappingUserInfoById(program.createdBy);
    const response: ProgramResponse = {
      ...this.objectMapper.convertValue(program, new ProgramResponse()),
      media: program.media.map((e) => {
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
      id: program._id.toString(),
      faceImage: user.faceImage,
      bioUrl: user.bioUrl,
      country: user.birthCountry.alpha2Code,

      createdAt: +this.dateUtil.convertDateToFormat(program.createdAt, 'x'),
      updatedAt: +this.dateUtil.convertDateToFormat(program.updatedAt, 'x'),

      currentUserVoting:
        program?.ratings?.find((e) => e.createdBy === currentUserId)?.star || 0,
    };

    return {
      ...response,
      ageFrom: convertAgeToString(parseInt(response.ageFrom)),
      ageTo: convertAgeToString(parseInt(response.ageTo)),
    };
  }
}

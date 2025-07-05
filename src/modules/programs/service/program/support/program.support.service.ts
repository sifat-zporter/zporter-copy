import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResponseMessage } from '../../../../../common/constants/common.constant';
import { mappingUserInfoById } from '../../../../../helpers/mapping-user-info';
import { MediaUtil } from '../../../../../utils/media-util';
import { AbstractService } from '../../../../abstract/abstract.service';
import { MediaDto } from '../../../../diaries/dto/diary.dto';
import { Role } from '../../../../diaries/enum/diaries.enum';
import { UserTypes } from '../../../../users/enum/user-types.enum';
import { User } from '../../../../users/repositories/user/user';
import { ProgramsRequestDto } from '../../../dtos/program/programs-request.dto';
import { ProgramResponse } from '../../../dtos/program/programs-response.dto';
import { MediaSource } from '../../../repositories/program/media-source';
import { Program } from '../../../repositories/program/program';
import { ProgramsRepository } from '../../../repositories/program/programs.repository';
import { IProgramsRepository } from '../../../repositories/program/programs.repository.interface';
import { IProgramSupportService } from './program.support.service.interface';
import { TypeOfPrograms } from '../../../enums/type-of-programs';
import { convertAgeToString } from '../../../../../utils/convert-age-to-string';
import { Types } from 'mongoose';

@Injectable()
export class ProgramSupportService
  extends AbstractService<IProgramsRepository>
  implements IProgramSupportService
{
  constructor(
    @Inject(ProgramsRepository)
    private _repository: IProgramsRepository,
  ) {
    super(_repository);
  }

  /**
   * Because these things are optional so I must have (?.) to check existed.
   * TODO: need to find the better solution for these
   */
  generateNewProgram(
    request: ProgramsRequestDto,
    programExists: Program,
    user: User,
    version: number,
    isNewProgram: boolean,
  ): Program {
    const deleted: boolean = request?.isDeleted || false;

    const program: Program = {
      _id: isNewProgram ? new Types.ObjectId() : request.id,
      idRoot: null,
      index: 0,
      createdBy: user?.userId || programExists?.createdBy,
      headline: request?.headline || '',
      ingressText: request?.ingressText || '',
      description: request?.description || '',
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
      minParticipants: request?.minParticipants || '2',
      ageFrom: +request?.ageFrom || 1,
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
      username: user?.username || programExists?.username,
      birthCountry: user?.profile?.birthCountry || programExists?.birthCountry,
      country: user?.profile?.birthCountry.name || programExists?.country,
      city: user?.profile?.city || programExists?.city,
      clubId:
        user?.type == UserTypes.PLAYER
          ? user?.playerCareer?.clubId
          : user?.coachCareer?.clubId || programExists?.clubId,
      userType: user?.type || programExists?.userType,
      birthYear:
        Number(user?.profile?.birthDay?.substring(0, 4)) ||
        programExists?.birthYear,
      role: user ? this.generateUserRole(user) : programExists?.role,
      numberExecuted: 0,
      avgStar: 0,
      ratings: [],
      parentProgramId:
        programExists?.parentProgramId || request?.parentProgramId,
      libProgramId: programExists?.libProgramId || request?.libProgramId,
      version: version || 1,
      isPublic: request?.isPublic ?? true,
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

  async validateRequestHeadline(
    programId: string,
    request: ProgramsRequestDto,
  ): Promise<void> {
    const program: Program = await this.repository.customedFindOne(
      {
        headline: request.headline,
        mainCategory: request.mainCategory,
        isDeleted: false,
      },
      {
        _id: 1,
      },
    );
    if (program && programId !== program._id.toString()) {
      throw new BadRequestException(
        `Program: '${request.headline}' - ${ResponseMessage.Program.DUPLICATED_HEADLINE}`,
      );
    }
  }

  async generateProgramResponse(
    program: Program,
    currentUserId?: string,
  ): Promise<ProgramResponse> {
    const user = await mappingUserInfoById(program.createdBy);
    const programMapping = this.objectMapper.convertValue(
      program,
      new ProgramResponse(),
    );
    const response: ProgramResponse = {
      ...programMapping,
      ageFrom: convertAgeToString(parseInt(programMapping.ageFrom)),
      ageTo: convertAgeToString(parseInt(programMapping.ageTo)),
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
      linkShare: `${
        process.env.WEB_BASE_URL
      }/programs/sessions/${program._id.toString()}`,
    };
    return response;
  }
}

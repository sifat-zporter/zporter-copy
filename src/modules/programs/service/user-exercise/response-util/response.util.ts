import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { UserInfoDto } from '../../../../../common/constants/common.constant';
import { ObjectMapper } from '../../../../../utils/objectMapper';
import { MediaDto } from '../../../../diaries/dto/diary.dto';
import { UserExerciseResponse } from '../../../dtos/user-exercise/response/user-exercise.response';
import { UserSessionResponse } from '../../../dtos/user-exercise/response/user-session.response';
import { ProgressStatus } from '../../../enums/progress.status';
import { Exercise } from '../../../repositories/exercise/exercise';
import { Session } from '../../../repositories/session/session';
import { UserExecution } from '../../../repositories/user-exercise/user-execution';
import { Program } from '../../../repositories/program/program';
import { UserProgramResponse } from '../../../dtos/user-exercise/response/user-program.response';
import { ClubRepository } from '../../../../clubs/repository/club.repository';
import { IClubRepository } from '../../../../clubs/repository/club.repository.interface';
import { Club } from '../../../../clubs/repository/club';
import { User } from '../../../../users/repositories/user/user';
import { UserRepository } from '../../../../users/repositories/user/user.repository';
import { IUserRepository } from '../../../../users/repositories/user/user.repository.interface';
import { getBioUrl } from '../../../../../utils/get-bio-url';
import { ProgramResponse } from '../../../dtos/program/programs-response.dto';
import { IResponseUtil } from './response.util.interface';
import { ProgramSupportService } from '../../program/support/program.support.service';
import { IProgramSupportService } from '../../program/support/program.support.service.interface';
import { DateUtil } from '../../../../../utils/date-util';
import { ExerciseSupportService } from '../../exercise/support/exercise.support.service';
import { ExerciseResponseDto } from '../../../dtos/exercise/exercises-response.dto';
import { convertAgeToString } from '../../../../../utils/convert-age-to-string';
import { CommentsService } from '../../../../comments/comments.service';

@Injectable()
export class ResponseUtil implements IResponseUtil {
  constructor(
    @Inject(ObjectMapper)
    private objectMapper: ObjectMapper,
    @Inject(ClubRepository)
    private clubRepository: IClubRepository,
    @Inject(UserRepository)
    private userRepository: IUserRepository,

    @Inject(ProgramSupportService)
    private programSupportService: IProgramSupportService,

    @Inject(ExerciseSupportService)
    private exerciseSupportService: ExerciseSupportService,

    @Inject(forwardRef(() => CommentsService))
    private commentsService: CommentsService,
  ) {}

  async generateExerciseResponse(
    currentUserId: string,
    exercise: Exercise,
    session: Session,
    userExercise: UserExecution,
    user?: UserInfoDto,
  ): Promise<UserExerciseResponse> {
    const exerciseResponse: ExerciseResponseDto =
      this.exerciseSupportService.generateExerciseResponse(exercise);
    const dataMapping = this.objectMapper.convertValue(
      exerciseResponse,
      new UserExerciseResponse(),
    );

    const response: UserExerciseResponse = {
      ...dataMapping,
      // ...exerciseResponse,

      id: exercise._id.toString(),
      // media: exercise.media.map((e) => {
      //   const mediaDto: MediaDto = {
      //     source: e.source,
      //     thumbnail: e.thumbnail,
      //     type: e.type,
      //     uniqueKey: e.uniqueKey,
      //     url: e.url,
      //   };
      //   return mediaDto;
      // }),
      // sessionId: session._id.toString(),
      executedTime: userExercise ? userExercise.updatedAt : null,
      status: userExercise ? userExercise.status : ProgressStatus.TO_DO,
      countComments: await this.commentsService.countCommentsByTypeId(
        exercise._id.toString(),
      ),
      currentUserVoting:
        exercise?.ratings?.find((e) => e.createdBy === currentUserId)?.star ||
        0,
    };

    if (user) {
      response.fullname = user.fullName;
      response.country = user.birthCountry.name;
      response.city = user.city;
      response.clubName = user.clubName;
      response.username = user.username;
      response.userType = user.type;
      response.faceImage = user.faceImage;
      response.bioUrl = user.bioUrl;
    }
    return response;
  }

  async generateSessionResponse(
    currentUserId: string,
    session: Session,
    userSession: UserExecution,
    user?: UserInfoDto,
  ): Promise<UserSessionResponse> {
    const dataMapping = this.objectMapper.convertValue(
      session,
      new UserSessionResponse(),
    );
    const response: UserSessionResponse = {
      ...dataMapping,
      id: session._id.toString(),
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
      executedTime: userSession ? userSession.updatedAt : null,
      status: userSession ? userSession.status : ProgressStatus.TO_DO,
      currentUserVoting:
        session?.ratings?.find((e) => e.createdBy === currentUserId)?.star || 0,

      createdAt: +new DateUtil().convertDateToFormat(session.createdAt, 'x'),
      updatedAt: +new DateUtil().convertDateToFormat(session.updatedAt, 'x'),

      countComments: await this.commentsService.countCommentsByTypeId(
        session._id.toString(),
      ),

      ageFrom: convertAgeToString(parseInt(dataMapping.ageFrom)),
      ageTo: convertAgeToString(parseInt(dataMapping.ageTo)),
    };

    if (user) {
      response.fullname = user.fullName;
      response.username = user.username;
      response.country = user.birthCountry.name;
      response.city = user.city;
      response.userType = user.type;
      response.faceImage = user.faceImage;
      response.bioUrl = user.bioUrl;
      response.clubName = user.clubName;
    }
    return response;
  }

  async generateUserProgramResponse(
    currentUserId: string,
    program: Program,
    doneProgram?: UserExecution,
  ): Promise<UserProgramResponse> {
    const club: Club = await this.clubRepository.customedFindOne({
      clubId: program.clubId,
    });
    const user: User = await this.userRepository.getOne({
      userId: program.createdBy,
    });
    const programResponse: ProgramResponse =
      await this.programSupportService.generateProgramResponse(program);

    const response: UserProgramResponse = {
      ...programResponse,

      id: program._id.toString(),
      country: program.birthCountry?.alpha2Code,
      clubName: club?.clubName || '',
      faceImage: user?.media?.faceImage
        ? user?.media?.faceImage
        : process.env.DEFAULT_IMAGE,
      bioUrl: getBioUrl({
        type: user.type,
        username: user.username,
        lastName: user?.profile?.lastName,
        firstName: user?.profile?.firstName,
      }),
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

      status: doneProgram?.status ?? ProgressStatus.TO_DO,
      currentUserVoting:
        program?.ratings?.find((e) => e.createdBy === currentUserId)?.star || 0,
      excutedTime: doneProgram?.updatedAt ?? null,

      isSaved: program?.bookmarkUserIds?.includes(currentUserId) || false,

      isPublic: program?.isPublic || false,

      ageFrom: convertAgeToString(parseInt(programResponse.ageFrom)),
      ageTo: convertAgeToString(parseInt(programResponse.ageTo)),
    };

    return response;
  }
}

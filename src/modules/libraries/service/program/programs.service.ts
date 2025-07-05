import { Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as mongoose from 'mongoose';
import {
  GenderTypes,
  ResponseMessage,
} from '../../../../common/constants/common.constant';
import { SortBy } from '../../../../common/pagination/pagination.dto';
import { deleteNullValuesInArray } from '../../../../utils/delete-null-values-in-array';
import { AbstractService } from '../../../abstract/abstract.service';
import { UserTypes } from '../../../users/enum/user-types.enum';
import { User } from '../../../users/repositories/user/user';
import { UserRepository } from '../../../users/repositories/user/user.repository';
import { IUserRepository } from '../../../users/repositories/user/user.repository.interface';
import { LibProgramRepository } from '../../repository/program/lib.program.repository';
import { ProgramsRequestDto } from '../../../programs/dtos/program/programs-request.dto';
import { Program } from '../../../programs/repositories/program/program';
import { TypeOfPrograms } from '../../../programs/enums/type-of-programs';
import {
  GetDetailResponse,
  ProgramResponse,
} from '../../../programs/dtos/program/programs-response.dto';
import { GetProgramsDto } from '../../../programs/dtos/program/get-programs.dto';
import { ILibProgramSupportService } from './support/program.support.service.interface';
import { LibProgramSupportService } from './support/program.support.service';
import { LibFactoryRepository } from '../../repository/lib-factory.repository';
import { LibraryType } from '../../enum/library.type';
import { ILibEntity } from '../../interface/entity.interface';
import { ILibProgramsService } from './program.service.interface';
import { LibSessionsService } from '../session/sessions.service';
import { ILibSessionService } from '../session/sessions.service.interface';
import { DateUtil } from '../../../../utils/date-util';
import { Types } from 'mongoose';
import { TotalService } from '../../../programs/service/total/total.service';
import { ITotalService } from '../../../programs/service/total/total.service.interface';
import { mappingUserInfoById } from '../../../../helpers/mapping-user-info';
import { convertAgeToString } from '../../../../utils/convert-age-to-string';
import { SessionsRequestDto } from '../../../programs/dtos/session/sessions-request.dto';
import { ExercisesRequestDto } from '../../../programs/dtos/exercise/exercises-request.dto';

@Injectable()
export class LibProgramsService
  extends AbstractService<LibFactoryRepository>
  implements ILibProgramsService
{
  constructor(
    @Inject(LibProgramRepository)
    private programRepository: LibProgramRepository,

    @Inject(LibFactoryRepository)
    private libFactoryRepository: LibFactoryRepository,

    @Inject(LibSessionsService)
    private libSessionsService: ILibSessionService,

    @Inject(UserRepository)
    private userRepository: IUserRepository,

    @Inject(LibProgramSupportService)
    private supportService: ILibProgramSupportService,

    @Inject(TotalService)
    private readonly totalService: ITotalService,
  ) {
    super(libFactoryRepository);
  }

  async getDetailById(
    currentUserId: string,
    id: string,
  ): Promise<GetDetailResponse> {
    const program = await this.getProgramById(id, currentUserId);
    const sessions = await this.libSessionsService.getChildrenByProgramId(
      currentUserId,
      id,
    );
    const result: GetDetailResponse = new GetDetailResponse({
      programs: [program],
      sessions,
    });
    return result;
  }

  async mappingProgramRequest(
    programDto: ProgramsRequestDto,
  ): Promise<ProgramsRequestDto> {
    const programExists = await this.programRepository.getProgramDetailById(
      programDto.id.toString(),
    );
    if (!programExists) {
      return programDto;
    }

    const programMapping: ProgramsRequestDto = new ProgramsRequestDto();
    const timeNow = new Date();

    // map session
    const sessions: SessionsRequestDto[] = [];
    const sessionIds: string[] = [];

    if (programDto.sessions) {
      for (let i = 0; i < programDto.sessions.length; i++) {
        sessions.push(programDto.sessions[i]);
        sessionIds.push(programDto.sessions[i].id.toString());
      }
    }

    for (let i = 0; i < programExists.sessions.length; i++) {
      if (!sessionIds.includes(programExists.sessions[i]._id.toString())) {
        const session: SessionsRequestDto = new SessionsRequestDto();
        const exercises = programExists.sessions[i].exercises.map((exercie) => {
          const ex: ExercisesRequestDto = new ExercisesRequestDto();
          Object.assign(ex, {
            ...exercie,
            id: exercie._id,
            createdAt: exercie.createdAt
              ? new Date(exercie.createdAt)
              : timeNow,
          });

          return ex;
        });

        Object.assign(session, {
          ...programExists.sessions[i],
          id: programExists.sessions[i]._id,
          exercises: exercises.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ),
        });

        sessions.push({
          ...session,
          createdAt: session.createdAt ? session.createdAt : timeNow,
        });
      } else {
        const index = sessionIds.indexOf(
          programExists.sessions[i]._id.toString(),
        );

        if (index >= 0) {
          // map exercises
          const exercises: ExercisesRequestDto[] = [];
          const exerciseIds: string[] = [];

          programDto.sessions[index].exercises.map((exercise) => {
            exercises.push(exercise);
            exerciseIds.push(exercise.id.toString());
          });

          // check exercise exists in database
          programExists.sessions[i].exercises.map((exercie) => {
            if (!exerciseIds.includes(exercie._id.toString())) {
              const ex: ExercisesRequestDto = new ExercisesRequestDto();
              Object.assign(ex, {
                ...exercie,
                id: exercie._id,
                createdAt: exercie.createdAt ? exercie.createdAt : timeNow,
              });

              exercises.push(ex);
            }
          });

          // mapping exercises with session index
          sessions[index] = {
            ...sessions[index],
            createdAt: programExists.sessions[i].createdAt,
            exercises: exercises,
          };
        }
      }
    }

    Object.assign(programMapping, {
      ...programDto,
      sessions: sessions.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    });

    return programMapping;
  }

  async createOrUpdate(
    programDto: ProgramsRequestDto,
    currentUserId: string,
  ): Promise<void> {
    const user: User = await this.userRepository.customedFindOne({
      userId: currentUserId,
    });
    if (!user) {
      throw new HttpException('User not found!', HttpStatus.NOT_FOUND);
    }

    const programModel = this.supportService.generateNewProgram(
      programDto,
      user,
    );

    // Check if the program is public then validate headline and create a new program in Program section
    if (programDto.isPublic) {
      const dto = await this.mappingProgramRequest(programDto);
      await this.supportService.validateRequestHeadline(dto);

      dto.libProgramId = programModel._id;
      await this.totalService.createAndPublishProgram(dto, user);
    }

    // create or update program
    await this.repository
      .getLibRepository(LibraryType.PROGRAM)
      .createOrUpdate(programModel, {
        _id: programModel._id,
      });

    // create session
    if (programDto.sessions) {
      await this.libSessionsService.createManySession(
        programDto.sessions,
        programModel,
        currentUserId,
      );
    }
  }

  async duplicateProgram(
    programId: string,
    currentUserId: string,
  ): Promise<void> {
    const [user, program] = await Promise.all([
      this.userRepository.getOne({
        userId: currentUserId,
      }),
      this.repository.getLibRepository(LibraryType.PROGRAM).customedFindOne({
        _id: programId,
      }),
    ]);
    if (!program) {
      throw new HttpException(
        ResponseMessage.Program.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    if (!user) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    //# validate the new headline
    const newHeadline = `${program.headline}(copy)`;
    await this.validateProgramHeadline(
      newHeadline,
      program.mainCategory,
      program._id.toString(),
    );

    //# update program's information
    program._id = new mongoose.Types.ObjectId();
    program.headline = newHeadline;
    program.numberExecuted = 0;
    // program.createdAt = this.dateUtil.getNowTimeInMilisecond();
    // program.updatedAt = this.dateUtil.getNowTimeInMilisecond();

    //# update program's information related to `createdBy`
    program.createdBy = currentUserId;
    program.fullname =
      ((user?.profile?.firstName as string) || 'Zporter') +
      ' ' +
      ((user?.profile?.lastName as string) || 'Anonymous');
    program.username = user.username;
    program.birthCountry = user?.profile?.birthCountry;
    program.country = user?.profile?.birthCountry.name;
    program.city = user?.profile?.city;
    program.clubId =
      user.type == UserTypes.PLAYER
        ? user.playerCareer.clubId
        : user.coachCareer.clubId;
    program.userType = user.type;
    program.gender = user?.profile?.gender || GenderTypes.Other;
    program.birthYear = Number(user.profile.birthDay.substring(0, 4));
    program.role = this.supportService.generateUserRole(user);

    await this.repository
      .getLibRepository(LibraryType.PROGRAM)
      .createOrUpdate(program, {
        _id: program._id.toString(),
      });
  }

  async validateProgramHeadline(
    headline: string,
    programType: TypeOfPrograms,
    programId?: string,
  ): Promise<void> {
    try {
      const numberExercise: number = programId
        ? await this.repository.getLibRepository(LibraryType.PROGRAM).count({
            _id: { $ne: programId },
            headline: headline,
            isDeleted: false,
            typeOfProgram: programType,
          })
        : await this.repository.getLibRepository(LibraryType.PROGRAM).count({
            headline: headline,
            isDeleted: false,
            typeOfProgram: programType,
          });

      if (numberExercise) {
        throw new HttpException(
          ResponseMessage.Program.DUPLICATED_HEADLINE,
          HttpStatus.NOT_FOUND,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async getProgramById(programId: string, userId: string) {
    const program = await this.programRepository.getProgramDetailById(
      programId,
    );
    if (!program) {
      throw new HttpException('Program not found', HttpStatus.NOT_FOUND);
    }
    const user = await mappingUserInfoById(program.createdBy);

    return {
      ...program,
      id: program._id,
      fullname: user.fullName,
      birthCountry: user.birthCountry,
      city: user.city,
      clubName: user.clubName,
      username: user.username,
      userType: user.type,
      createdBy: user.userId,
      faceImage: user.faceImage,
      bioUrl: user.bioUrl,
      country: user.birthCountry.alpha2Code,
      ageFrom: convertAgeToString(parseInt(program.ageFrom)),
      ageTo: convertAgeToString(parseInt(program.ageTo)),
      isPublic: program?.isPublic,
      isSaved: program?.bookmarkUserIds.includes(userId),
      sessions: program?.sessions?.map((session) => ({
        ...session,
        id: session._id,
        fullname: user.fullName,
        birthCountry: user.birthCountry,
        city: user.city,
        clubName: user.clubName,
        username: user.username,
        userType: user.type,
        createdBy: user.userId,
        faceImage: user.faceImage,
        bioUrl: user.bioUrl,
        country: user.birthCountry.alpha2Code,
        ageFrom: convertAgeToString(parseInt(session.ageFrom)),
        ageTo: convertAgeToString(parseInt(session.ageTo)),
        exercises: session?.exercises?.map((exercise) => ({
          ...exercise,
          id: exercise._id,
          fullname: user.fullName,
          birthCountry: user.birthCountry,
          city: user.city,
          clubName: user.clubName,
          username: user.username,
          userType: user.type,
          createdBy: user.userId,
          faceImage: user.faceImage,
          bioUrl: user.bioUrl,
          country: user.birthCountry.alpha2Code,
          ageFrom: convertAgeToString(parseInt(exercise.ageFrom)),
          ageTo: convertAgeToString(parseInt(exercise.ageTo)),
        })),
      })),
    };
  }

  async getProgramByType(
    getProgramsByTypeDto: GetProgramsDto,
  ): Promise<ProgramResponse[]> {
    try {
      const {
        mainCategory,
        limit: pageSize,
        startAfter: page,
        sorted,
      } = getProgramsByTypeDto;

      const sort = sorted == SortBy.ASC ? 1 : -1;
      const data: ILibEntity[] = await this.repository
        .getLibRepository(LibraryType.PROGRAM)
        .customedFind({
          match: { mainCategory, isDeleted: false },
          keySort: { createdAt: sort },
          page: +page,
          pageSize: +pageSize,
        });

      const result = await Promise.all(
        data.map(async (program) => {
          try {
            const response: ProgramResponse =
              await this.supportService.generateProgramResponse(program);
            return response;
          } catch (error) {
            return null;
          }
        }),
      );

      return deleteNullValuesInArray(result);
    } catch (error) {
      throw error;
    }
  }

  async toggleBookmarked(currentUserId: string, id: string): Promise<void> {
    const program: Program = await this.programRepository.customedFindOne(
      {
        _id: id,
      },
      {
        _id: 1,
        bookmarkUserIds: 1,
      },
    );
    if (!program) {
      throw new HttpException(
        ResponseMessage.Program.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const bookmarkUserIds: string[] = program.bookmarkUserIds;
    const isIncludesUserId: boolean = bookmarkUserIds.includes(currentUserId);

    const newBookmarkUserIds: string[] =
      isIncludesUserId === true
        ? bookmarkUserIds.filter((e) => e !== currentUserId)
        : bookmarkUserIds.concat(currentUserId);

    await this.programRepository.createOrUpdate(
      { bookmarkUserIds: newBookmarkUserIds } as Program,
      {
        _id: program._id.toString(),
      },
    );
  }

  async softDelete(doc: ILibEntity, docId: string): Promise<void> {
    await this.repository
      .getLibRepository(LibraryType.PROGRAM)
      .createOrUpdate(doc, { _id: docId });

    const sessions = await this.repository
      .getLibRepository(LibraryType.SESSION)
      .get({
        match: { programId: new Types.ObjectId(docId), isDeleted: false },
      });
    sessions.forEach(async (session) => {
      session.isDeleted = true;
      session.deletedAt = new DateUtil().getNowDate();
      await this.libSessionsService.softDelete(session, session._id.toString());
    });
  }
}

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import * as mongoose from 'mongoose';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { SortBy } from '../../../../common/pagination/pagination.dto';
import { deleteNullValuesInArray } from '../../../../utils/delete-null-values-in-array';
import { AbstractService } from '../../../abstract/abstract.service';
import { User } from '../../../users/repositories/user/user';
import { UserRepository } from '../../../users/repositories/user/user.repository';
import { IUserRepository } from '../../../users/repositories/user/user.repository.interface';
import { GetProgramsDto } from '../../dtos/program/get-programs.dto';
import { ProgramsRequestDto } from '../../dtos/program/programs-request.dto';
import {
  GetDetailResponse,
  ProgramResponse,
} from '../../dtos/program/programs-response.dto';
import { TypeOfPrograms } from '../../enums/type-of-programs';
import { Exercise } from '../../repositories/exercise/exercise';
import { ExercisesRepository } from '../../repositories/exercise/exercises.repository';
import { IExercisesRepository } from '../../repositories/exercise/exercises.repository.interface';
import { PROGRAMS_MODEL, Program } from '../../repositories/program/program';
import { ProgramsRepository } from '../../repositories/program/programs.repository';
import { IProgramsRepository } from '../../repositories/program/programs.repository.interface';
import { Session } from '../../repositories/session/session';
import { SessionsRepository } from '../../repositories/session/sessions.repository';
import { ISessionRepository } from '../../repositories/session/sessions.repository.interface';
import { IProgramsService } from './programs.service.interface';
import { ProgramSupportService } from './support/program.support.service';
import { IProgramSupportService } from './support/program.support.service.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ITotalCommonService } from '../total/total.service.interface';
import { SessionsService } from '../session/sessions.service';
import { PipelineStage } from 'mongoose';
import { mappingUserInfoById } from '../../../../helpers/mapping-user-info';
import { convertAgeToString } from '../../../../utils/convert-age-to-string';
import { UpsertProgramDto } from '../../dtos/v2/program/upsert-program.dto';

@Injectable()
export class ProgramsService
  extends AbstractService<IProgramsRepository>
  implements IProgramsService, ITotalCommonService
{
  constructor(
    @Inject(ProgramsRepository)
    private programRepository: IProgramsRepository,
    @Inject(SessionsRepository)
    private sessionsRepository: ISessionRepository,
    @Inject(ExercisesRepository)
    private exerciseRepository: IExercisesRepository,
    @Inject(UserRepository)
    private userRepository: IUserRepository,
    private readonly sessionsService: SessionsService,

    @Inject(ProgramSupportService)
    private supportService: IProgramSupportService,

    @InjectModel(PROGRAMS_MODEL)
    private programModel: Model<Program>,
  ) {
    super(programRepository);
  }

  async duplicateProgram(
    programId: string,
    currentUserId: string,
  ): Promise<void> {
    const [user, program] = await Promise.all([
      this.userRepository.getOne({
        userId: currentUserId,
      }),
      this.repository.customedFindOne({
        _id: programId,
      }),
    ]);
    if (!program) {
      throw new NotFoundException(ResponseMessage.Program.NOT_FOUND);
    }
    if (!user) {
      throw new NotFoundException(ResponseMessage.User.NOT_FOUND);
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
    program.createdBy = currentUserId;

    await this.repository.createOrUpdate(program, {
      _id: program._id.toString(),
    });
  }

  async validateProgramHeadline(
    headline: string,
    programType: TypeOfPrograms,
    programId?: string,
  ): Promise<void> {
    const numberExercise: number = programId
      ? await this.repository.count({
          _id: { $ne: programId },
          headline: headline,
          isDeleted: false,
          typeOfProgram: programType,
        })
      : await this.repository.count({
          headline: headline,
          isDeleted: false,
          typeOfProgram: programType,
        });

    if (numberExercise) {
      throw new BadRequestException(
        ResponseMessage.Program.DUPLICATED_HEADLINE,
      );
    }
  }

  async getProgramById(programId: string, currentUserId?: string) {
    const query: PipelineStage[] = [
      {
        $match: {
          _id: new Types.ObjectId(programId),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'program_sessions',
          let: {
            programId: '$_id',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$programId', '$$programId'],
                },
                isDeleted: false,
              },
            },
            {
              $sort: {
                order: 1,
              },
            },
            {
              $lookup: {
                from: 'program_exercises',
                let: {
                  sessionId: '$_id',
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$sessionId', '$$sessionId'],
                      },
                      isDeleted: false,
                    },
                  },
                  {
                    $sort: {
                      order: 1,
                    },
                  },
                ],
                as: 'exercises',
              },
            },
          ],
          as: 'sessions',
        },
      },
    ];

    const result = await this.programModel.aggregate(query);
    if (!result.length) {
      throw new NotFoundException('Program not exist!');
    }
    const program = result[0];
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
      isSaved: program?.bookmarkUserIds.includes(currentUserId),
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
      const data: Program[] = await this.repository.customedFind({
        match: {
          ...(mainCategory && { mainCategory }),
          isDeleted: false,
          isOldVersion: false,
        },
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

  async deleteProgram(programId: string): Promise<void> {
    const [program, numSession] = await Promise.all([
      this.getProgramById(programId),
      this.sessionsRepository.count({
        programId: programId,
        isDeleted: false,
      }),
    ]);

    if (!program) {
      throw new NotFoundException(ResponseMessage.Program.NOT_FOUND);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    const deleteOption: Object = {
      isDeleted: true,
      deletedAt: this.dateUtil.getNowDate(),
    };

    await this.repository.deleteHardUsingBulkWrite(
      { _id: programId },
      deleteOption as Program,
    );

    if (numSession) {
      await Promise.all([
        this.sessionsRepository.deleteHardUsingBulkWrite(
          { programId },
          deleteOption as Session,
        ),

        this.exerciseRepository.deleteHardUsingBulkWrite(
          { programId },
          deleteOption as Exercise,
        ),
      ]);
    }
  }

  async createOrUpdateSingleProgramWithSession(
    programDto: ProgramsRequestDto,
    user: User,
  ) {
    const programExists = await this.programRepository.customedFindOne({
      _id: programDto.id,
    });
    if (programExists && programExists.isOldVersion) {
      throw new HttpException(
        `This is old version of program ${programDto.headline} can not update`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const isNewProgram =
      programDto?.isPublic && (!programExists || programExists.isPublic);
    let program: Program;

    if (isNewProgram) {
      const countTotalOldVersions =
        await this.repository.getLastVersionAndSetIsOldVersion(
          programExists,
          programDto,
        );

      program = this.supportService.generateNewProgram(
        programDto,
        programExists,
        user,
        countTotalOldVersions + 1,
        isNewProgram,
      );
    } else {
      program = this.supportService.generateNewProgram(
        programDto,
        programExists,
        user,
        programExists?.version,
        isNewProgram,
      );
    }

    const result = await this.repository.createOrUpdateProgramWithSession(
      program,
    );

    // create sessions
    if (programDto.sessions) {
      await this.sessionsService.createManySession(
        programDto.sessions,
        result,
        isNewProgram,
      );
    }
  }

  async upsertProgram(
    program: UpsertProgramDto,
    userRoleId?: string,
  ): Promise<Program> {
    if (program.ageFrom === 'All') {
      program.ageFrom = '1';
    }
    if (program.ageTo === 'All') {
      program.ageTo = '100';
    }

    if (!program.id) {
      program.id = new Types.ObjectId().toString();
    }

    return await this.programModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(program.id),
      },
      {
        ...program,
        _id: new Types.ObjectId(program.id),
        createdBy: userRoleId,
      },
      { upsert: true },
    );
  }

  async getDetailById(id: string): Promise<GetDetailResponse> {
    const program = await this.getProgramById(id);
    const sessions = await this.sessionsService.getChildrenByProgramId(id);
    const result: GetDetailResponse = new GetDetailResponse({
      programs: [program],
      sessions,
    });
    return result;
  }
}

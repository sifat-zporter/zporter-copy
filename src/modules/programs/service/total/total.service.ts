import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProgramTotalRequestDto } from '../../dtos/program-total-request.dto';
import { ProgramsRequestDto } from '../../dtos/program/programs-request.dto';
import { TargetType } from '../../enums/target.type';
import { ExercisesRepository } from '../../repositories/exercise/exercises.repository';
import { ProgramsRepository } from '../../repositories/program/programs.repository';
import { SessionsRepository } from '../../repositories/session/sessions.repository';
import { ProgramsService } from '../program/programs.service';
import { SessionsService } from '../session/sessions.service';
import { ITotalCommonService, ITotalService } from './total.service.interface';
import { GetDetailResponse } from '../../dtos/program/programs-response.dto';
import { User } from '../../../users/repositories/user/user';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { UserRepository } from '../../../users/repositories/user/user.repository';
import { IUserRepository } from '../../../users/repositories/user/user.repository.interface';
import { SessionsRequestDto } from '../../dtos/session/sessions-request.dto';
import { ExercisesRequestDto } from '../../dtos/exercise/exercises-request.dto';
import { ExercisesService } from '../exercise/exercises.service';

@Injectable()
export class TotalService implements ITotalService {
  constructor(
    @Inject(forwardRef(() => ProgramsService))
    private readonly programService: ProgramsService,

    private readonly sessionService: SessionsService,
    private readonly exerciseService: ExercisesService,

    private readonly programRepository: ProgramsRepository,
    private readonly sessionRepository: SessionsRepository,
    private readonly exerciseRepository: ExercisesRepository,

    @Inject(UserRepository)
    private userRepository: IUserRepository,
  ) {}

  getService(type: TargetType): ITotalCommonService {
    switch (type) {
      case TargetType.PROGRAM:
        return this.programService;
      case TargetType.SESSION:
        return this.sessionService;
    }
  }

  async validateHeadline(request: ProgramsRequestDto) {
    const headlineExists = await this.programRepository.customedFindOne({
      headline: request.headline,
      isDeleted: false,
      isOldVersion: {
        $ne: true,
      },
    });

    if (
      headlineExists &&
      headlineExists?.libProgramId?.toString() !== request.id.toString() &&
      headlineExists._id.toString() !== request.id.toString()
    ) {
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

  async createAndPublishProgram(programDto: ProgramsRequestDto, user: User) {
    // mapping session and exercises exists in the database
    const dto = await this.mappingProgramRequest(programDto);

    // validate headline
    if (dto?.isPublic) {
      await this.validateHeadline(dto);
    }

    // create a new program
    await this.programService.createOrUpdateSingleProgramWithSession(dto, user);
  }

  async updateProgram(
    request: ProgramTotalRequestDto,
    currentUserId: string,
  ): Promise<void> {
    if (!request.program) {
      throw new HttpException('program is required', HttpStatus.BAD_REQUEST);
    }

    const user: User = await this.userRepository.customedFindOne({
      userId: currentUserId,
    });
    if (!user) {
      throw new HttpException('User not found!', HttpStatus.NOT_FOUND);
    }

    return this.createAndPublishProgram(request.program, user);
  }

  async deleteExistedProgram(programs: ProgramsRequestDto[]): Promise<void> {
    for (let index = 0; index < programs.length; index++) {
      const id = programs[index].id;
      if (Types.ObjectId.isValid(id)) {
        // await this.programService.deleteProgram(id.toString());
        await this.programRepository.deleteHard({
          _id: id,
        });
        await this.sessionRepository.deleteHard({
          programId: id,
        });
        await this.exerciseRepository.deleteHard({
          programId: id,
        });
      }
    }
  }

  async getDetailById(
    id: string,
    type: TargetType,
  ): Promise<GetDetailResponse> {
    const response = await this.getService(type).getDetailById(id);
    return response;
  }

  async createSession(userRoleId: string, request: SessionsRequestDto) {
    const { programId } = request;
    const program = await this.programRepository.customedFindOne({
      _id: programId,
    });

    if (!program) {
      throw new HttpException('Program not found', HttpStatus.NOT_FOUND);
    }

    await this.sessionService.createManySession([request], program, false);
  }

  async createExercise(userRoleId: string, request: ExercisesRequestDto) {
    const { sessionId } = request;
    const session = await this.sessionRepository.customedFindOne({
      _id: sessionId,
    });
    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    await this.exerciseService.createManyExercise([request], session, false);
  }
}

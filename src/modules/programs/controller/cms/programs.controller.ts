import {
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LocalAuthGuard } from '../../../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../../../common/decorators/authorization.decorator';
import { AbstractController } from '../../../abstract/abstract.controller';
import { CommonResponse } from '../../../abstract/dto/common-response';
import { DuplicateRequest } from '../../dtos/duplicate.request';
import { GetProgramsDto } from '../../dtos/program/get-programs.dto';
import { ProgramResponse } from '../../dtos/program/programs-response.dto';
import { TargetType } from '../../enums/target.type';
import { ExercisesService } from '../../service/exercise/exercises.service';
import { IExercisesService } from '../../service/exercise/exercises.sevice.interface';
import { ProgramsService } from '../../service/program/programs.service';
import { IProgramsService } from '../../service/program/programs.service.interface';
import { SessionsService } from '../../service/session/sessions.service';
import { ISessionsService } from '../../service/session/sessions.service.interface';
import { Program } from '../../repositories/program/program';
import { UpsertProgramDto } from '../../dtos/v2/program/upsert-program.dto';
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiTags('Programs')
@Controller('programs')
export class ProgramsControllers extends AbstractController<IProgramsService> {
  constructor(
    @Inject(forwardRef(() => ProgramsService))
    private programService: IProgramsService,

    @Inject(SessionsService)
    private sessionService: ISessionsService,
    @Inject(ExercisesService)
    private exerciseService: IExercisesService,
  ) {
    super(programService);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Duplicate program/session/exercise`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Test.CREATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Post('duplicate')
  async duplicate(
    @Body() request: DuplicateRequest,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<CommonResponse<null>> {
    if (request.targetType == TargetType.PROGRAM) {
      await this.service.duplicateProgram(request.targetId, userRoleId);
    }
    if (request.targetType == TargetType.SESSION) {
      await this.sessionService.duplicateSession(request.targetId, userRoleId);
    }
    if (request.targetType == TargetType.EXERCISE) {
      await this.exerciseService.duplicateExercise(
        request.targetId,
        userRoleId,
      );
    }
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Delete(':programId')
  @ApiOperation({
    summary: `Delete program`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async deleteProgram(
    @Param('programId') programId: string,
  ): Promise<CommonResponse<null>> {
    await this.service.deleteProgram(programId);

    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: null,
    });
  }

  // @ApiBearerAuth()
  // @UseGuards(LocalAuthGuard)
  @Get('program-by-id/:programId')
  @ApiOperation({
    summary: `Get program  by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getProgramById(
    @AuthorizationAndGetUserId([false]) currentUserId: string,
    @Param('programId') programId: string,
  ): Promise<CommonResponse<ProgramResponse>> {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.getProgramById(programId, currentUserId),
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('program-by-type')
  @ApiOperation({
    summary: `Get program  by type`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getProgramByType(
    @Query() getProgramsByTypeDto: GetProgramsDto,
  ): Promise<CommonResponse<ProgramResponse[]>> {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.getProgramByType(getProgramsByTypeDto),
    });
  }

  // create program
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('')
  async createProgram(
    @Body() program: UpsertProgramDto,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<CommonResponse<Program>> {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.upsertProgram(program, userRoleId),
    });
  }

  // upsert program
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Patch('upsert-program')
  async upsertProgram(
    @Body() program: UpsertProgramDto,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<CommonResponse<Program>> {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.upsertProgram(program, userRoleId),
    });
  }

  // update with backup
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Patch('update-with-backup')
  async updateWithBackup(
    @Body() program: UpsertProgramDto,
  ): Promise<CommonResponse<any>> {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.createOrUpdateSingleProgramWithSession(
        program as any,
        {} as any,
      ),
    });
  }
}

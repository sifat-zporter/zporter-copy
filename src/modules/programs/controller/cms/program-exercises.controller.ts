import {
  Body,
  Controller,
  Delete,
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

import { AbstractController } from '../../../abstract/abstract.controller';
import { CommonResponse } from '../../../abstract/dto/common-response';

import { ExerciseResponseDto } from '../../dtos/exercise/exercises-response.dto';
import { GetExercisesDto } from '../../dtos/exercise/get-exercises.dto';
import { ExercisesService } from '../../service/exercise/exercises.service';
import { IExercisesService } from '../../service/exercise/exercises.sevice.interface';
import { ExercisesRequestDto } from '../../dtos/exercise/exercises-request.dto';
import { AuthorizationAndGetUserId } from '../../../../common/decorators/authorization.decorator';

@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiTags('Program-Exercises')
@Controller('program-exercises')
export class ExercisesControllers extends AbstractController<IExercisesService> {
  constructor(
    @Inject(ExercisesService)
    private programExercisesService: IExercisesService,
  ) {
    super(programExercisesService);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Delete(':programExerciseId')
  @ApiOperation({
    summary: `Delete program exercise`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async deleteProgram(
    @Param('programExerciseId') programExerciseId: string,
  ): Promise<CommonResponse<null>> {
    await this.programExercisesService.deleteExercise(programExerciseId);

    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('program-exercise-by-id/:programExerciseId')
  @ApiOperation({
    summary: `Get program exercise by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getSessionById(
    @Param('programExerciseId') programExerciseId: string,
  ): Promise<CommonResponse<ExerciseResponseDto>> {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.programExercisesService.getExerciseById(
        programExerciseId,
      ),
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('exercises-by-session-id')
  @ApiOperation({
    summary: `Get program exercise by programSessionId`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getSessionByProgram(
    @Query() getExerciseBySessionId: GetExercisesDto,
  ): Promise<CommonResponse<ExerciseResponseDto[]>> {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.programExercisesService.getExercisesBySessionId(
        getExerciseBySessionId,
      ),
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('')
  @ApiOperation({
    summary: `Create program exercise`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async createExercise(
    @Body() createExerciseDto: ExercisesRequestDto,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<CommonResponse<ExerciseResponseDto>> {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.programExercisesService.createOrUpdateExercises(
        [createExerciseDto],
        userRoleId,
      ),
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Patch(':programExerciseId')
  @ApiOperation({
    summary: `Patch program exercise`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async updateExercise(
    @Param('programExerciseId') programExerciseId: string,
    @Body() updateExerciseDto: ExercisesRequestDto,
  ): Promise<CommonResponse<ExerciseResponseDto>> {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.programExercisesService.createOrUpdateExercises([
        updateExerciseDto,
      ]),
    });
  }
}

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationAndGetUserId } from '../../../../common/decorators/authorization.decorator';
import { UserTypes } from '../../../users/enum/user-types.enum';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LocalAuthGuard } from '../../../../auth/guards/local-auth.guard';
import { TotalService } from '../../service/total/total.service';
import { ProgramTotalRequestDto } from '../../dtos/program-total-request.dto';
import { GetDetailResponse } from '../../dtos/program/programs-response.dto';
import { TargetType } from '../../enums/target.type';
import { CommonResponse } from '../../../abstract/dto/common-response';
import { AbstractController } from '../../../abstract/abstract.controller';
import { ITotalService } from '../../service/total/total.service.interface';
import { ResponseMessage } from '../../../../common/constants/common.constant';
import { SessionsRequestDto } from '../../dtos/session/sessions-request.dto';
import { ExercisesRequestDto } from '../../dtos/exercise/exercises-request.dto';

@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiTags('Program')
@Controller('program')
export class NewProgramController extends AbstractController<ITotalService> {
  constructor(
    @Inject(TotalService)
    private readonly totalService: ITotalService,
  ) {
    super(totalService);
  }

  @Post('multiple')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  async updateProgram(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Body() request: ProgramTotalRequestDto,
  ): Promise<any> {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.totalService.updateProgram(request, userRoleId),
    });
  }

  @Post('session')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  async createSession(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Body() request: SessionsRequestDto,
  ) {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.createSession(userRoleId, request),
    });
  }

  @Post('exercise')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  async createExercise(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Body() request: ExercisesRequestDto,
  ) {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.createExercise(userRoleId, request),
    });
  }

  @Get(':type/:id/detail')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get detail  by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiCreatedResponse({
    type: GetDetailResponse,
  })
  async getDetailById(
    @Param('type') type: TargetType,
    @Param('id') id: string,
  ): Promise<CommonResponse<GetDetailResponse>> {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.getDetailById(id, type),
    });
  }
}

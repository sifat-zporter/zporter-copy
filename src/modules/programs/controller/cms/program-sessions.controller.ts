import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Inject, Query } from '@nestjs/common/decorators';
import {
  ApiBearerAuth,
  ApiBody,
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
import { GetSessionsByProgramId } from '../../dtos/session/get-sessions.dto';
import { SessionsRequestDto } from '../../dtos/session/sessions-request.dto';
import SessionResponseDto from '../../dtos/session/sessions-response.dto';
import { SessionsService } from '../../service/session/sessions.service';
import { ISessionsService } from '../../service/session/sessions.service.interface';
import { ProgramsRepository } from '../../repositories/program/programs.repository';
import { IProgramsRepository } from '../../repositories/program/programs.repository.interface';

@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiTags('Program-Sessions')
@Controller('program-sessions')
export class SessionsControllers extends AbstractController<ISessionsService> {
  constructor(
    @Inject(SessionsService)
    private programSessionsService: ISessionsService,

    @Inject(ProgramsRepository)
    private programRepository: IProgramsRepository,
  ) {
    super(programSessionsService);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create program session`,
  })
  @ApiBody({ type: SessionsRequestDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Test.CREATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Post()
  async createSessions(
    @Body() programSessionsRequestDto: SessionsRequestDto,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<CommonResponse<null>> {
    const program = await this.programRepository.customedFindOne({
      _id: programSessionsRequestDto.programId,
    });
    await this.programSessionsService.createManySession(
      [programSessionsRequestDto],
      program,
      true,
    );
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: null,
    });
  }

  @Patch(':programSessionId')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Update session`,
  })
  @ApiBody({ type: SessionsRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Test.UPDATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updateSession(
    @Param('programSessionId') programSessionId: string,
    @Body() updateSessionsRequestDto: SessionsRequestDto,
  ): Promise<CommonResponse<null>> {
    await this.programSessionsService.createOrUpdateSessions([
      updateSessionsRequestDto,
    ]);
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Delete(':programSessionId')
  @ApiOperation({
    summary: `Delete session`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async deleteSession(
    @Param('programSessionId') programSessionId: string,
  ): Promise<CommonResponse<null>> {
    await this.programSessionsService.deleteSession(programSessionId);

    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('program-session-by-id/:programSessionId')
  @ApiOperation({
    summary: `Get program session by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getSessionById(
    @Param('programSessionId') programSessionId: string,
  ): Promise<CommonResponse<SessionResponseDto>> {
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.programSessionsService.getSessionById(programSessionId),
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('program-session-by-program-id')
  @ApiOperation({
    summary: `Get program session by programId`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getSessionByProgram(
    @Query() getSessionsByProgramId: GetSessionsByProgramId,
  ): Promise<CommonResponse<SessionResponseDto[]>> {
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.programSessionsService.getSessionsByProgramId(
        getSessionsByProgramId,
      ),
    });
  }
}

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LocalAuthGuard } from '../../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../../common/decorators/authorization.decorator';
import { AbstractController } from '../../abstract/abstract.controller';
import { CommonResponse } from '../../abstract/dto/common-response';
import { ExecutionRequestDto } from '../dtos/user-exercise/request/done-exercise-request.dto';
import { GetUserExerciseRequest } from '../dtos/user-exercise/request/get-user-exercise.request';
import { GetUserProgramRequest } from '../dtos/user-exercise/request/get-user-program.request';
import { GetUserSessionRequest } from '../dtos/user-exercise/request/get-user-session.request';
import { UserExerciseResponse } from '../dtos/user-exercise/response/user-exercise.response';
import { ResponseGetProgram } from '../dtos/user-exercise/response/user-program.response';
import { UserSessionResponse } from '../dtos/user-exercise/response/user-session.response';
import { UserExercisesService } from '../service/user-exercise/user-exercises.service';
import { IUserExercisesService } from '../service/user-exercise/user-exercises.sevice.interface';
import { ClearExecutionRequest } from '../dtos/user-exercise/request/clear-execution.request.dto';
import { BookmarkRequestDto } from '../dtos/program/bookmark/bookmark.request.dto';
import { CommentRequestDto } from '../dtos/comment/comment.request.dto';
import { ICommentService } from '../service/comment/comment.service.interface';
import { ProgCommentService } from '../service/comment/comment.service';
import { GetCommentRequest } from '../dtos/comment/get-comment.request.dto';
import { CommentResponse } from '../dtos/comment/comment.response.dto';

@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiTags('User-exercises')
@Controller('user-exercises')
export class UserExercisesControllers extends AbstractController<IUserExercisesService> {
  constructor(
    @Inject(UserExercisesService)
    private userExercisesService: IUserExercisesService,
    @Inject(ProgCommentService)
    private commentService: ICommentService,
    private readonly userExercisesServices: UserExercisesService,
  ) {
    super(userExercisesService);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create user exercise`,
  })
  @ApiBody({ type: ExecutionRequestDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Test.CREATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Post('run-exercise')
  async markedExerciseDone(
    @Body() markedExerciseDoneDto: ExecutionRequestDto,
    @AuthorizationAndGetUserId() userRoleId: string,
  ) {
    const res = await this.service.runExercise(
      userRoleId,
      markedExerciseDoneDto,
    );
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: res,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Clear historical execution.`,
  })
  @Put()
  async clearExecution(
    @Body() request: ClearExecutionRequest,
    @AuthorizationAndGetUserId() userRoleId: string,
  ) {
    await this.service.clearExecution(request.programId, userRoleId);
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @Get('programs')
  @ApiOperation({
    summary: `Get programs by tab`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getProgram(
    @AuthorizationAndGetUserId([false]) userId: string,
    @Query() programRequest: GetUserProgramRequest,
  ): Promise<ResponseGetProgram> {
    const result = await this.userExercisesServices.getProgram(
      userId,
      programRequest,
    );
    return {
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      totalPage: result.totalPage,
      currentPage: result.currentPage,
      body: result.data,
    };
  }

  @Put('programs/:id/activate')
  activateProgram(
    @AuthorizationAndGetUserId([false]) userId: string,
    @Param('id') programId: string,
  ) {
    return this.userExercisesService.activateProgram(programId, userId);
  }

  @Get('sessions')
  @ApiOperation({
    summary: `Get session by programId`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getSessionByProgram(
    @AuthorizationAndGetUserId([false]) userId: string,
    @Query() sessionRequest: GetUserSessionRequest,
  ): Promise<CommonResponse<UserSessionResponse[]>> {
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.service.getSession(userId, sessionRequest),
    });
  }

  @Get('exercises')
  @ApiOperation({
    summary: `Get exercises by sessionId`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getExerciseBySession(
    @AuthorizationAndGetUserId([false]) userId: string,
    @Query() exerciseRequest: GetUserExerciseRequest,
  ): Promise<CommonResponse<UserExerciseResponse[]>> {
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.service.getExercise(userId, exerciseRequest),
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('program/bookmark')
  @ApiOperation({
    summary: `Save/Delete program on 'Save' icon`,
  })
  async toggleBookmarkedProgram(
    @AuthorizationAndGetUserId()
    currentUserId: string,
    @Body()
    request: BookmarkRequestDto,
  ): Promise<CommonResponse<null>> {
    await this.service.toggleBookmarkedProgram(
      currentUserId,
      request.programId,
    );

    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('program/comment')
  @ApiOperation({
    summary: `Create comment on Program/Session/Exercise`,
  })
  async comment(
    @AuthorizationAndGetUserId()
    currentUserId: string,
    @Body()
    request: CommentRequestDto,
  ): Promise<CommonResponse<null>> {
    await this.commentService.commentDoc(
      currentUserId,
      request.targetId,
      request.content,
      request.type,
    );

    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('program/comment')
  @ApiOperation({
    summary: `Get comments on Program/Session/Exercise`,
  })
  async getComments(
    @AuthorizationAndGetUserId()
    currentUserId: string,
    @Query()
    request: GetCommentRequest,
  ): Promise<CommonResponse<CommentResponse[]>> {
    const result: CommentResponse[] = await this.commentService.getComment(
      request.targetId,
      request.type,
    );

    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: result,
    });
  }
}

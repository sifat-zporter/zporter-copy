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
import { LocalAuthGuard } from '../../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../../common/decorators/authorization.decorator';
import { Timezone } from '../../../common/decorators/timezone.decorator';
import { AbstractController } from '../../abstract/abstract.controller';
import { CommonResponse } from '../../abstract/dto/common-response';
import {
  GetListUserTestByCategory,
  GetUserTestByType,
} from '../dtos/user-test/request/get-user-test-by-type.request';
import { GetUserTestRequest } from '../dtos/user-test/get-user-test.request';
import { GetLeaderboardRequest } from '../dtos/user-test/request/get-leader-board.request';
import { LeaderboardResponse } from '../dtos/user-test/response/leaderboard.response';
import { UpdateUserTestRequest } from '../dtos/user-test/request/update-user-test.request';
import {
  UserTestRequest,
  UserTestRequestForCoach,
} from '../dtos/user-test/request/user-test.request';
import { UserTestResponse } from '../dtos/user-test/user-test.response';
import { VerifyUserTest } from '../dtos/user-test/verify-user-test';
import { UserTestService } from '../service/user-test/user-test.service';
import { IUserTestService } from '../service/user-test/user-test.service.interface';
import { ChartResponse } from '../dtos/user-test/response/individual-chart.response';
import { GetIndividualChartRequest } from '../dtos/user-test/request/get-individual-char.request';
import { ShareResultRequest } from '../dtos/user-test/request/share-result.request';
import { GetTotalChartRequest } from '../dtos/user-test/request/get-total-chart.request';
import { ResultStorageService } from '../service/result-storage/result-storage.service';
import { IResultStorageService } from '../service/result-storage/result-storage.interface';
import { UserSubtypeResponse } from '../dtos/user-test/user-subtype.response';
import { ControllerResponse } from '../dtos/user-test/response/controller.response';
import { ListUserTestResponse } from '../dtos/user-test/get-list-user-test.response';

@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiTags('Test-user')
@Controller('user-tests')
export class UserTestsController extends AbstractController<IUserTestService> {
  constructor(
    @Inject(UserTestService)
    private readonly userTestsService: IUserTestService,
    @Inject(ResultStorageService)
    private readonly resultStorageService: IResultStorageService,
  ) {
    super(userTestsService);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create user tests`,
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
  @Post('')
  async create(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() userTestDto: UserTestRequest,
    @Timezone() timezone: string,
  ): Promise<CommonResponse<null>> {
    await this.service.createUserTest(userTestDto, userRoleId, timezone);
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create user tests by coach`,
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
  @Post('coach')
  async createUserTestForCoach(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() userTestDto: UserTestRequestForCoach,
    @Timezone() timezone: string,
  ): Promise<CommonResponse<null>> {
    await this.service.createUserTestByCoach(userTestDto, userRoleId, timezone);
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  // @ApiBearerAuth()
  // @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get list test results`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @Get('tests-results')
  async getUserTests(
    @AuthorizationAndGetUserId() userRoleId?: string,
    @Query() userTestQuery?: GetUserTestByType,
  ): Promise<CommonResponse<UserSubtypeResponse[]>> {
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.service.getListUserTestResults(
        userRoleId,
        userTestQuery,
      ),
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get list player test results by coach`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @Get('coach/tests-results')
  async getUserTestsByCoach(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() request: GetListUserTestByCategory,
  ): Promise<CommonResponse<ListUserTestResponse[]>> {
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.service.getListUserTestResultsByCoach(
        userRoleId,
        request,
      ),
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('tests-results-by-query')
  @ApiOperation({
    summary: `Get tests result by query`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getTestResultByQuery(
    @Query() getUserTestRequest: GetUserTestRequest,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<CommonResponse<UserTestResponse[]>> {
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.service.getUserTestResult(
        userRoleId,
        getUserTestRequest,
      ),
    });
  }

  @Patch('verify-user-test')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `verify user tests`,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async verifyTestRecord(
    @Body() verifyTestDto: VerifyUserTest,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<CommonResponse<null>> {
    await this.service.verifyUserTest(
      userRoleId,
      verifyTestDto.userTestId,
      verifyTestDto.isVerified,
    );
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @Patch(':userTestId')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Update user test`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Test.UPDATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updateUserTest(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('userTestId') userTestId: string,
    @Body() updateUserTestDto: UpdateUserTestRequest,
    @Timezone() timezone: string,
  ): Promise<CommonResponse<null>> {
    await this.service.updateUserTest(
      userRoleId,
      updateUserTestDto,
      userTestId,
      timezone,
    );
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @Delete(':userTestId')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Delete users tests`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Test.DELETED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deleteUserTest(
    @Param('userTestId') userTestId: string,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<CommonResponse<null>> {
    await this.service.deleteUserTest(userTestId, userRoleId);
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get list leaderboard test`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @Get('leaderboard')
  async getListLeaderBoardUserTest(
    // @Param('testId') testId: string,
    @Query() getLeaderboardRequest: GetLeaderboardRequest,
  ): Promise<CommonResponse<LeaderboardResponse>> {
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.service.getListLeaderboard(getLeaderboardRequest),
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get individual chart`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @Get('individual-chart')
  async getIndividualChart(
    @AuthorizationAndGetUserId() currentUserId: string,
    @Query() getChart: GetIndividualChartRequest,
  ): Promise<CommonResponse<ChartResponse>> {
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.service.getIndividualTestChart(currentUserId, getChart),
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get total chart`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @Get('total-chart')
  async getTotalChart(
    @AuthorizationAndGetUserId() currentUserId: string,
    @Query() getChart: GetTotalChartRequest,
  ): Promise<CommonResponse<ChartResponse>> {
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.resultStorageService.getTotalTestChart(
        currentUserId,
        getChart,
      ),
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Share test result to Feed`,
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
  @Post('share')
  async sharetoFeed(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() shareResultRequest: ShareResultRequest,
  ): Promise<CommonResponse<null>> {
    await this.service.shareUserTestResult(
      shareResultRequest.userTestId,
      userRoleId,
    );
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get some last recent controllers`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @Get('recent-controllers')
  async getRecentControllers(
    @AuthorizationAndGetUserId() currentUserId: string,
  ): Promise<CommonResponse<ControllerResponse[]>> {
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.userTestsService.getListRecentController(currentUserId),
    });
  }
}

import {
  Body,
  Controller,
  Get,
  HttpStatus,
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
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { UserRoleId } from '../../common/decorators/role-id.decorator';
import { UserIdQueryDto } from '../../common/dto/user-id-query.dto';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Diary, Injury } from '../diaries/interfaces/diaries.interface';
import { GetHealthChartQuery } from '../healths/dto/health.req.dto';
import { DashboardService } from './dashboard.service';
import {
  BaseQueryBuilder,
  DashboardQueryBuilder,
  GetDevelopmentTalkChartDto,
  GetDiaryRoutineChartQuery,
  GetLeaderBoardQuery,
  GetListDiariesReportDto,
  GetListDiariesReportQuery,
  GetListDreamTeamQuery,
  GetMatchChartQuery,
  ShareCapturedDreamTeamDto,
  ShareCapturedLeaderBoardDto,
} from './dto/dashboard.req.dto';
import {
  OutputDiaryRoutineChart,
  OutputListDiaryRoutine,
  OutputMatchesChart,
  OutputMatchTab,
  OutputTotalTab,
  OutputTrainingBio,
  OutputTrainingTab,
} from './dto/dashboard.res.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('share-leaderboard')
  @ApiOperation({
    summary: `Share leaderboard`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async shareLeaderBoard(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() shareCapturedLeaderBoardDto: ShareCapturedLeaderBoardDto,
  ) {
    return this.dashboardService.shareLeaderBoard(
      userRoleId,
      shareCapturedLeaderBoardDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('share-dream-team')
  @ApiOperation({
    summary: `Share dream team`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async shareDreamTeam(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() shareCapturedDreamTeamDto: ShareCapturedDreamTeamDto,
  ) {
    return this.dashboardService.shareDreamTeam(
      userRoleId,
      shareCapturedDreamTeamDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-list-dream-teams')
  @ApiOperation({
    summary: `Get list dream teams`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListDreamTeams(
    @Query() getListDreamTeamQuery: GetListDreamTeamQuery,
  ) {
    return this.dashboardService.getListDreamTeams(getListDreamTeamQuery);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-friends-stats')
  @ApiOperation({
    summary: `Get friends statistic`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getFriendsStats(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() baseQueryBuilder: BaseQueryBuilder,
  ) {
    return this.dashboardService.getFriendsStats(userRoleId, baseQueryBuilder);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-fans-stats')
  @ApiOperation({
    summary: `Get fans statistic`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getFansStats(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() baseQueryBuilder: BaseQueryBuilder,
  ) {
    return this.dashboardService.getFansStats(userRoleId, baseQueryBuilder);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-visitor-stats')
  @ApiOperation({
    summary: `Get visitors statistic`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getVisitorStats(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() baseQueryBuilder: BaseQueryBuilder,
  ) {
    return this.dashboardService.getVisitorStats(userRoleId, baseQueryBuilder);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-visits-stats')
  @ApiOperation({
    summary: `Get visits statistic`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getVisitsStats(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() baseQueryBuilder: BaseQueryBuilder,
  ) {
    return this.dashboardService.getVisitsStats(userRoleId, baseQueryBuilder);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-list-leader-boards')
  @ApiOperation({
    summary: `Get diaries statistic`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListLeaderBoards(@Query() getLeaderBoardQuery: GetLeaderBoardQuery) {
    return this.dashboardService.getListLeaderBoards(getLeaderBoardQuery);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-diaries-statistic')
  @ApiOperation({
    summary: `Get diaries statistic`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getDiariesStats(
    @Query() dashboardQueryBuilder: DashboardQueryBuilder,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<
    OutputTotalTab | OutputTrainingTab | OutputMatchTab | OutputTrainingBio
  > {
    return this.dashboardService.getDiariesStats(
      dashboardQueryBuilder,
      userRoleId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-list-diaries-report')
  @ApiOperation({
    summary: `Get diaries statistic`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListDiariesReport(
    @Query() getListDiariesReportQuery: GetListDiariesReportQuery,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<Diary[]> {
    return this.dashboardService.getListDiariesReport(
      getListDiariesReportQuery,
      userRoleId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-matches-chart')
  @ApiOperation({
    summary: `Get matches chart`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getMatchesChart(
    @Query() getMatchChartQuery: GetMatchChartQuery,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<OutputMatchesChart> {
    return this.dashboardService.getMatchesChart(
      getMatchChartQuery,
      userRoleId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-diaries-routine-chart')
  @ApiOperation({
    summary: `Get diaries routine chart`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getDiariesRoutineChart(
    @Query() getDiaryRoutineChartQuery: GetDiaryRoutineChartQuery,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<OutputDiaryRoutineChart> {
    return this.dashboardService.getDiariesRoutineChart(
      getDiaryRoutineChartQuery,
      userRoleId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-list-diaries-routine-report')
  @ApiOperation({
    summary: `Get list diaries routine report`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListDiariesRoutineReport(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getListDiariesReportDto: GetListDiariesReportDto,
  ): Promise<OutputListDiaryRoutine[]> {
    return this.dashboardService.getListDiariesRoutineReport(
      userRoleId,
      getListDiariesReportDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-list-injuries-report')
  @ApiOperation({
    summary: `Get list injuries report`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListInjuriesReport(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<Injury[]> {
    return this.dashboardService.getListInjuriesReport(
      userRoleId,
      paginationDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-injuries-chart')
  @ApiOperation({
    summary: `Get injuries chart`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getInjuriesChart(
    @Query() baseQueryBuilder: BaseQueryBuilder,
    @AuthorizationAndGetUserId() userRoleId: string,
  ) {
    return this.dashboardService.getInjuriesChart(baseQueryBuilder, userRoleId);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-development-talk-chart')
  @ApiOperation({
    summary: `Get development talk chart`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getDevelopmentNotesRoutine(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getDevelopmentTalkChartDto: GetDevelopmentTalkChartDto,
  ) {
    return this.dashboardService.getDevelopmentNotesRoutine(
      userRoleId,
      getDevelopmentTalkChartDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-list-development-notes')
  @ApiOperation({
    summary: `Get list development notes`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListDevelopmentNotes(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.dashboardService.getListDevelopmentNotes(
      userRoleId,
      paginationDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('player/get-list-personal-goals')
  @ApiOperation({
    summary: `Get list personal goals`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListPersonalGoals(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.dashboardService.getListPersonalGoals(
      userRoleId,
      paginationDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-list-healths')
  @ApiOperation({
    summary: `Get list healths`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListHealsReport(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.dashboardService.getListHealsReport(userRoleId, paginationDto);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-health-charts')
  @ApiOperation({
    summary: `Get health charts`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getHealthChats(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getHealthChartQuery: GetHealthChartQuery,
  ) {
    return this.dashboardService.getHealthCharts(
      userRoleId,
      getHealthChartQuery,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-height-prediction')
  @ApiOperation({
    summary: `Get height prediction`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getHeightPrediction(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() userIdQueryDto: UserIdQueryDto,
  ) {
    const { userIdQuery } = userIdQueryDto;
    const userIdForQuery = userIdQuery ? userIdQuery : userRoleId;
    return this.dashboardService.getHeightPrediction(userIdForQuery);
  }
}

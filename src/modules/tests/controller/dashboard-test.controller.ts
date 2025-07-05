import { ApiBearerAuth, ApiHeaders, ApiOperation, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Controller, Get, HttpStatus, Inject, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LocalAuthGuard } from "../../../auth/guards/local-auth.guard";
import { AuthorizationAndGetUserId } from "../../../common/decorators/authorization.decorator";
import { ResponseMessage } from "../../../common/constants/common.constant";
import { CommonResponse } from "../../abstract/dto/common-response";
import { DashboardTestService, GetTestAverageRequest, TestAverageResponse, GetTeamIndexRequest, TeamIndexResponse, SubtypeIndexResponse, SubtypeChartResponse, TeamTotalChartResponse, TeamTotalChartRequest } from '../service/dashboard-test/dashboard-test.service';
import { DirectLeaderboardService, GetLeaderboardRequestDto, LeaderboardResponseDto } from "../service/dashboard-test/leaderboard.service";

@ApiHeaders([
    {
        name: "roleId",
        description: "roleId aka user document Id",
    },
])
@ApiTags("dashboard-test")
@Controller("/dashboard-test")
export class DashboardTestController {

    constructor(
        @Inject(DashboardTestService)
        private readonly dashboardTestService: DashboardTestService,

        @Inject(DirectLeaderboardService)
        private readonly directLeaderboardService: DirectLeaderboardService,
    ) {
    }

    @ApiOperation({
        summary: "Get average test scores by test type",
        description: "Get average test scores by test type for users in team with optional filters"
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Get average test scores successful",
    })
    @ApiBearerAuth()
    @UseGuards(LocalAuthGuard)
    @Get("player-updates")
    async getTestAverages(
        @AuthorizationAndGetUserId() userRoleId: string,
        @Query() request: GetTestAverageRequest,
    ): Promise<CommonResponse<TestAverageResponse[]>> {
        return {
            message: ResponseMessage.Common.SUCCESS,
            statusCode: HttpStatus.OK,
            body: await this.dashboardTestService.getTestAveragesByTeam(
                userRoleId,
                request,
            ),
        };
    }

    @ApiOperation({ 
        summary: "Get test leaderboard for a specific test",
        description: "Retrieves leaderboard data for either Long Jump or Sprint-10m test with optional filtering by team and time range"
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Leaderboard data retrieved successfully",
        type: LeaderboardResponseDto,
    })
    @ApiQuery({ name: 'subtypeName', required: true, description: 'subtypeName to get leaderboard for (must be either "Long Jump" or "Sprint-10m")' })
    @ApiQuery({ name: 'teamId', required: false, description: 'Optional team ID to filter by' })
    @ApiQuery({ name: 'startTime', required: false, description: 'Start time for filtering (Unix timestamp in ms)' })
    @ApiQuery({ name: 'endTime', required: false, description: 'End time for filtering (Unix timestamp in ms)' })
    @ApiBearerAuth()
    @UseGuards(LocalAuthGuard)
    @Get("leaderboard")
    async getLeaderboard(
        @AuthorizationAndGetUserId() userRoleId: string,
        @Query() request: GetLeaderboardRequestDto,
    ): Promise<CommonResponse<LeaderboardResponseDto>> {
        return {
            message: ResponseMessage.Common.SUCCESS,
            statusCode: HttpStatus.OK,
            body: await this.directLeaderboardService.getLeaderboard(userRoleId, request),
        };
    }

    @ApiOperation({
        summary: "Get team index by test type",
        description: "Get team index scores by test type with optional filters for team and player"
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Get team index successful",
    })
    @ApiQuery({ name: 'teamId', required: false, description: 'Optional team ID to filter by' })
    @ApiQuery({ name: 'userId', required: false, description: 'Optional user ID to filter by' })
    @ApiQuery({ name: 'typeOfTest', required: true, description: 'Type of test to get index for' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start of period (Unix timestamp in ms)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End of period (Unix timestamp in ms)' })
    @ApiBearerAuth()
    @UseGuards(LocalAuthGuard)
    @Get("/team-index")
    async getTeamIndex(
        @AuthorizationAndGetUserId() userRoleId: string,
        @Query() request: GetTeamIndexRequest,
    ): Promise<CommonResponse<TeamIndexResponse>> {
        return {
            message: ResponseMessage.Common.SUCCESS,
            statusCode: HttpStatus.OK,
            body: await this.dashboardTestService.getTeamIndex(
                userRoleId,
                request,
            ),
        };
    }

    @ApiOperation({
        summary: "Get team index by subtype test",
        description: "Get team index scores by subtype test with optional filters for team and player"
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Get team index successful",
    })
    @ApiQuery({ name: 'teamId', required: false, description: 'Optional team ID to filter by' })
    @ApiQuery({ name: 'userId', required: false, description: 'Optional user ID to filter by' })
    @ApiQuery({ name: 'typeOfTest', required: true, description: 'Type of test to get index for' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start of period (Unix timestamp in ms)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End of period (Unix timestamp in ms)' })
    @ApiBearerAuth()
    @UseGuards(LocalAuthGuard)
    @Get("/team-index-by-subtype-test")
    async getTeamIndexBySubtypeTest(
        @AuthorizationAndGetUserId() userRoleId: string,
        @Query() request: GetTeamIndexRequest,
    ): Promise<CommonResponse<SubtypeChartResponse>> {
        return {
            message: ResponseMessage.Common.SUCCESS,
            statusCode: HttpStatus.OK,
            body: await this.dashboardTestService.getTeamIndexBySubtypeTest(
                userRoleId,
                request,
            ),
        };
    }

    @ApiOperation({
        summary: "Get team total test chart",
        description: "Get team total test chart with optional filters for team and player"
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Get team total test chart successful",
    })
    @ApiQuery({ name: 'teamId', required: false, description: 'Optional team ID to filter by' })
    @ApiQuery({ name: 'testType', required: true, description: 'Type of test to get index for' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start of period (Unix timestamp in ms)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End of period (Unix timestamp in ms)' })
    @ApiBearerAuth()
    @UseGuards(LocalAuthGuard)
    @Get("/team-total-test-chart")
    async getTeamTotalTestChart(
        @AuthorizationAndGetUserId() userRoleId: string,
        @Query() request: TeamTotalChartRequest,
    ): Promise<CommonResponse<TeamTotalChartResponse>> {
        return {
            message: ResponseMessage.Common.SUCCESS,
            statusCode: HttpStatus.OK,
            body: await this.dashboardTestService.getTeamTotalTestChart(
                userRoleId,
                request,
            ),
        };
    }
}
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Ip,
  Param,
  Patch,
  Post,
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
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { IsAdmin } from '../../common/decorators/is-admin.decorator';
import { MemberLeaveRequestDto } from './dto/member.leave.request.dto';
import {
  BlockMemberTeamDto,
  ChangeStatusJoinTeamDto,
  ChangeStatusJoinTeamQuery,
  ConfirmBlockOrDeleteFromTeamQuery,
  CreateTeamDto,
  CreateTeamSignUpDto,
  GetAllMembersInTeam,
  GetTeamByIdQuery,
  SearchTeamMemberQuery,
  UnblockMembersTeamDto,
  UpdateMemberDto,
  UpdateTeamDto,
} from './dto/teams.req.dto';
import { TeamsRequestDto } from './dto/teams.request.dto';
import { ITeamsMongoService } from './service/teams/teams.mongo.interface';
import { TeamsMongoService } from './service/teams/teams.mongo.service';
import { TeamsService } from './teams.service';
import { UpdateOrderRequestDto } from './dto/update-order-request.dto';

@ApiBearerAuth()
@UseGuards(LocalAuthGuard)
@ApiTags('Teams')
@Controller('teams')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    @Inject(TeamsMongoService)
    private readonly teamsMongoService: ITeamsMongoService,
  ) {}

  @Post('update-user-teams-order')
  @ApiBody({ type: UpdateOrderRequestDto })
  updatingUserTeamsOrder(@Body() updateOrderRequestDto: UpdateOrderRequestDto) {
    return this.teamsService.syncUserTeams(updateOrderRequestDto);
  }

  @Get('sync-owner-team')
  syncOwnerTeam() {
    return this.teamsService.synchronizeAdminManagerAllTeams();
  }

  @Post('test5678')
  testCreate(@Body() createTeamDto: TeamsRequestDto) {
    return this.teamsMongoService.createTeam(createTeamDto);
  }

  //# change status
  @Patch('test5679')
  testChange(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() changeStatusJoinTeamDto: ChangeStatusJoinTeamDto,
    @Query() changeStatusJoinTeamQuery: ChangeStatusJoinTeamQuery,
    @IsAdmin() isAdmin: boolean,
  ) {
    return this.teamsMongoService.changeStatusJoin(
      userRoleId,
      changeStatusJoinTeamDto,
      changeStatusJoinTeamQuery,
      isAdmin,
    );
  }

  //# block member
  @Post('test567')
  test(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() blockMemberTeamDto: BlockMemberTeamDto,
    @IsAdmin() isAdmin: boolean,
  ) {
    return this.teamsMongoService.blockMember(
      userRoleId,
      blockMemberTeamDto,
      isAdmin,
    );
  }

  @Post('test93/:teamId/send-request-join-team')
  testSendRequestJoinTeam(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsMongoService.sendRequestJoinTeam(userRoleId, teamId);
  }

  @Delete('test105/:teamId/leave-team')
  testLeaveTeam(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() request: MemberLeaveRequestDto,
  ) {
    return this.teamsMongoService.leaveTeam(userRoleId, request.teamId);
  }

  @Patch()
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Change status join team`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  changeStatusJoin(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() changeStatusJoinTeamDto: ChangeStatusJoinTeamDto,
    @Query() changeStatusJoinTeamQuery: ChangeStatusJoinTeamQuery,
  ) {
    return this.teamsService.changeStatusJoin(
      userRoleId,
      changeStatusJoinTeamDto,
      changeStatusJoinTeamQuery,
    );
  }

  @Post('block-member')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Block member`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Team.BLOCKED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  blockMember(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() blockMemberTeamDto: BlockMemberTeamDto,
  ) {
    return this.teamsService.blockMember(userRoleId, blockMemberTeamDto);
  }

  @Post('unblock-member')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Unblock member`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Team.UNBLOCKED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  unblockMember(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() unblockMembersTeamDto: UnblockMembersTeamDto,
  ) {
    return this.teamsService.unblockMember(userRoleId, unblockMembersTeamDto);
  }

  @Post('confirm-block-or-delete-in-a-team')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Member confirm delete/block member in a team`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async confirmDeleteOrBlockFromTeam(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query()
    confirmBlockOrDeleteFromTeamQuery: ConfirmBlockOrDeleteFromTeamQuery,
  ) {
    return this.teamsService.confirmDeleteOrBlockFromTeam(
      userRoleId,
      confirmBlockOrDeleteFromTeamQuery,
    );
  }

  @Get('get-all-member-from-joined-teams')
  @ApiOperation({
    summary: `Get all member from joined team`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async getAllMemberFromJoinedTeams(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query()
    getAllMembersInTeam: GetAllMembersInTeam,
  ) {
    return this.teamsService.getAllMemberFromJoinedTeams(
      userRoleId,
      getAllMembersInTeam,
    );
  }

  @Get('/:teamId')
  @ApiOperation({
    summary: `Get team by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  getTeamByMembersId(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.getTeamById(userRoleId, teamId);
  }

  @Get(':teamId/get-members')
  @ApiOperation({
    summary: `Get team members by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  getTeamMemberById(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
    @Query() getTeamByIdQuery: GetTeamByIdQuery,
  ) {
    return this.teamsService.getTeamMemberById(
      userRoleId,
      teamId,
      getTeamByIdQuery,
    );
  }

  @Get(':teamId/get-members-in-team')
  @ApiOperation({
    summary: `Get members in a team`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  getAllMemberInTeam(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
    @Query() getAllMembersInTeam: GetAllMembersInTeam,
  ) {
    return this.teamsService.getAllMemberInTeam(
      userRoleId,
      teamId,
      getAllMembersInTeam,
    );
  }

  @Post(':clubId/create-new-team')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create a new team`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Team.CREATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  createTeam(
    @Ip() ip: string,
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('clubId') clubId: string,
    @Body() createTeamDto: CreateTeamDto,
    @IsAdmin() isAdmin: boolean,
  ) {
    return this.teamsService.createTeam(
      ip,
      userRoleId,
      clubId,
      createTeamDto,
      isAdmin,
    );
  }

  @Post('create-new-team-when-sign-up')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create a new team in sign up flow`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Team.CREATED,
  })
  async createNewTeamInSignUpFlow(
    @Ip() ip: string,
    @Body() createTeamSignUpDto: CreateTeamSignUpDto,
  ) {
    return this.teamsService.createTeamWhenSignUp(ip, createTeamSignUpDto);
  }

  @Get(':teamId/search-team-member')
  @ApiOperation({
    summary: `Search team member`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  searchTeamMember(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
    @Query() searchTeamMemberQuery: SearchTeamMemberQuery,
    @IsAdmin() isAdmin: boolean,
  ) {
    return this.teamsService.searchTeamMember(
      userRoleId,
      teamId,
      searchTeamMemberQuery,
      isAdmin,
    );
  }

  @Post(':teamId/block-team')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Block team`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  blockTeam(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.blockTeam(userRoleId, teamId);
  }

  @Delete(':teamId/unblock-team')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Unblock team`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  unblockTeam(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.unblockTeam(userRoleId, teamId);
  }

  @Patch(':teamId/edit-team')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Edit team`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Team.UPDATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  updateTeam(
    @AuthorizationAndGetUserId() userRoleId: string,
    @IsAdmin() isAdmin: boolean,
    @Param('teamId') teamId: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(
      userRoleId,
      teamId,
      updateTeamDto,
      isAdmin,
    );
  }

  @Patch(':teamId/update-member')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Update member`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Team.UPDATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  updateMember(
    @AuthorizationAndGetUserId() userRoleId: string,
    @IsAdmin() isAdmin: boolean,
    @Param('teamId') teamId: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    return this.teamsService.updateMember(
      userRoleId,
      teamId,
      updateMemberDto,
      isAdmin,
    );
  }

  @Post(':teamId/send-request-join-team')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Send request to join team`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Team.SEND_REQUEST_JOIN_TEAM,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  sendRequestJoinTeam(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.sendRequestJoinTeam(userRoleId, teamId);
  }

  @Delete(':teamId/cancel-request-join-team')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Cancel request to join team`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Team.SEND_REQUEST_JOIN_TEAM,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  cancelRequestJoinTeam(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.cancelRequestJoinTeam(userRoleId, teamId);
  }

  @Delete(':teamId/leave-team')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Leave team`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Team.LEAVE_TEAM,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  leaveTeam(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.leaveTeam(userRoleId, teamId);
  }

  @Delete(':teamId/delete-team')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Delete team`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Team.DELETE_TEAM,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  deleteTeam(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.deleteTeam(userRoleId, teamId);
  }

  @Delete(':teamId/:memberId/delete-member')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Delete member`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Team.DELETE_MEMBER,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  deleteMember(
    @AuthorizationAndGetUserId() userRoleId: string,

    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.deleteMember(userRoleId, teamId, memberId);
  }

  @Delete(':teamId/:memberId/delete-join-request')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Delete join request`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Team.DELETE_REQUEST,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  deleteJoinRequest(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.deleteJoinRequest(userRoleId, teamId, memberId);
  }

  @Delete(':teamId/:memberId/delete-blocked-request')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Delete blocked request`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Team.DELETE_REQUEST,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  deleteBlockRequest(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.deleteBlockRequest(userRoleId, teamId, memberId);
  }
}

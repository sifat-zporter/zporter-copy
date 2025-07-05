import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
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
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { IsAdmin } from '../../common/decorators/is-admin.decorator';
import { UserRoleId } from '../../common/decorators/role-id.decorator';
import {
  BlockMemberDto,
  ChangeStatusJoinGroup,
  ChangeStatusJoinGroupDto,
  CreateGroupDto,
  GetGroupByIdQuery,
  SearchGroupMemberQuery,
  UnblockMembersDto,
  UpdateGroupDto,
  UpdateMemberDto,
} from './dto/group.req.dto';
import { GroupsService } from './groups.service';

@ApiBearerAuth()
@UseGuards(LocalAuthGuard)
@ApiTags('Groups')
@Controller('groups')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({
    summary: `Create a new group`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.CREATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  createGroup(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() createGroupDto: CreateGroupDto,
  ) {
    return this.groupsService.createGroup(userRoleId, createGroupDto);
  }

  // @ApiBearerAuth()
  // @UseGuards(LocalAuthGuard)
  // @Get('update-country-field')
  // @ApiOperation({
  //   summary: `Update country field for all group with no country.`,
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  // })
  // @ApiResponse({
  //   status: HttpStatus.BAD_REQUEST,
  //   description: 'Bad Request',
  // })
  // @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  // updateCountryForContacts(): Promise<string> {
  //   return this.groupsService.updateCountryForAllGroup();
  // }
  @Patch()
  @ApiOperation({
    summary: `Change status join group`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.UPDATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  changeStatusJoin(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() changeStatusJoinGroupDto: ChangeStatusJoinGroupDto,
    @Query() changeStatusJoinGroup: ChangeStatusJoinGroup,
  ) {
    return this.groupsService.changeStatusJoin(
      userRoleId,
      changeStatusJoinGroupDto,
      changeStatusJoinGroup,
    );
  }

  @Post('block-member')
  @ApiOperation({
    summary: `Block member`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.BLOCKED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  blockMember(
    @AuthorizationAndGetUserId() userRoleId: string,
    @IsAdmin() isAdmin: boolean,
    @Body() blockMemberDto: BlockMemberDto,
  ) {
    return this.groupsService.blockMember(userRoleId, blockMemberDto, isAdmin);
  }

  @Post('unblock-member')
  @ApiOperation({
    summary: `Unblock member`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.UNBLOCKED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  unblockMember(
    @AuthorizationAndGetUserId() userRoleId: string,
    @IsAdmin() isAdmin: boolean,
    @Body() unblockMembersDto: UnblockMembersDto,
  ) {
    return this.groupsService.unblockMember(
      userRoleId,
      unblockMembersDto,
      isAdmin,
    );
  }

  @Get(':groupId')
  @ApiOperation({
    summary: `Get group details by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  getGroupById(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.groupsService.getGroupById(userRoleId, groupId);
  }

  @Get(':groupId/get-members')
  @ApiOperation({
    summary: `Get group member by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  getGroupMembersById(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('groupId') groupId: string,
    @Query() getGroupByIdQuery: GetGroupByIdQuery,
  ) {
    return this.groupsService.getGroupMembersById(
      userRoleId,
      groupId,
      getGroupByIdQuery,
    );
  }

  @Get(':groupId/search-group-member')
  @ApiOperation({
    summary: `Create a new group`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  searchGroupMember(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('groupId') groupId: string,
    @Query() searchGroupMemberQuery: SearchGroupMemberQuery,
  ) {
    return this.groupsService.searchGroupMember(
      userRoleId,
      groupId,
      searchGroupMemberQuery,
    );
  }

  @Post(':groupId/block-group')
  @ApiOperation({
    summary: `Block group`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  blockGroup(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.groupsService.blockGroup(userRoleId, groupId);
  }

  @Delete(':groupId/unblock-group')
  @ApiOperation({
    summary: `Unblock group`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  unblockGroup(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.groupsService.unblockGroup(userRoleId, groupId);
  }

  @Patch(':groupId/edit-group')
  @ApiOperation({
    summary: `Edit group`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.UPDATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  updateGroup(
    @AuthorizationAndGetUserId() userRoleId: string,
    @IsAdmin() isAdmin: boolean,
    @Param('groupId') groupId: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupsService.updateGroup(
      userRoleId,
      groupId,
      updateGroupDto,
      isAdmin,
    );
  }

  @Patch(':groupId/update-member')
  @ApiOperation({
    summary: `Update member`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.UPDATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  updateMember(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('groupId') groupId: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    return this.groupsService.updateMember(
      userRoleId,
      groupId,
      updateMemberDto,
    );
  }

  @Post(':groupId/send-request-join-group')
  @ApiOperation({
    summary: `Send request to join group`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.SEND_REQUEST_JOIN_GROUP,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  sendRequestJoinGroup(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.groupsService.sendRequestJoinGroup(userRoleId, groupId);
  }

  @Delete(':groupId/cancel-request-join-group')
  @ApiOperation({
    summary: `Cancel request to join group`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.CANCEL_REQUEST_JOIN_GROUP,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  cancelRequestJoinGroup(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.groupsService.cancelRequestJoinGroup(userRoleId, groupId);
  }

  @Delete(':groupId/leave-group')
  @ApiOperation({
    summary: `Leave group`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.LEAVE_GROUP,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  leaveGroup(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.groupsService.leaveGroup(userRoleId, groupId);
  }

  @Delete(':groupId/delete-group')
  @ApiOperation({
    summary: `Delete group`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.DELETE_GROUP,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  deleteGroup(
    @AuthorizationAndGetUserId() userRoleId: string,
    @IsAdmin() isAdmin: boolean,
    @Param('groupId') groupId: string,
  ) {
    return this.groupsService.deleteGroup(userRoleId, groupId, isAdmin);
  }

  @Delete(':groupId/:memberId/delete-member')
  @ApiOperation({
    summary: `Delete member`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.DELETE_MEMBER,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  deleteMember(
    @AuthorizationAndGetUserId() userRoleId: string,
    @IsAdmin() isAdmin: boolean,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.groupsService.deleteMember(
      userRoleId,
      groupId,
      memberId,
      isAdmin,
    );
  }

  @Delete(':groupId/:memberId/delete-join-request')
  @ApiOperation({
    summary: `Delete join request`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.DELETE_REQUEST,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  deleteJoinRequest(
    @AuthorizationAndGetUserId() userRoleId: string,
    @IsAdmin() isAdmin: boolean,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.groupsService.deleteJoinRequest(
      userRoleId,
      groupId,
      memberId,
      isAdmin,
    );
  }

  @Delete(':groupId/:memberId/delete-blocked-request')
  @ApiOperation({
    summary: `Delete blocked request`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Group.DELETE_REQUEST,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  deleteBlockRequest(
    @AuthorizationAndGetUserId() userRoleId: string,
    @IsAdmin() isAdmin: boolean,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.groupsService.deleteBlockRequest(
      userRoleId,
      groupId,
      memberId,
      isAdmin,
    );
  }
}

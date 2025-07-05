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
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { get } from 'http';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { SecureCodeApiGuard } from '../../auth/guards/secure-code-api.guard';
import { ResponseMessage } from '../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { UserRoleId } from '../../common/decorators/role-id.decorator';
import {
  AddMultiFriendDto,
  FollowForMongoDto,
  FriendForMongoDto,
  GetListRelationshipsQuery,
  RequestRelationshipDto,
  ResponseRelationshipDto,
  SearchNotFriendQuery,
  UnblockFriendsDto,
} from './dto/friends.req.dto';
import { FriendsService } from './friends.service';
import { IFriend } from './schemas/friend.schemas';
@ApiTags('Friends')
@Controller('friends')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  // @Get('test')
  // async getRelationship() {
  //   return await this.friendsService.getCountRelationshipFromMongo('a78a8f3b-7ecb-4cf1-a9f1-403477ffef7e');
  // }

  @Get('search-not-friend')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Search not friend`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async searchUsersIsNotFriend(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() searchNotFriendQuery: SearchNotFriendQuery,
  ) {
    return this.friendsService.searchUsersIsNotFriend(
      userRoleId,
      searchNotFriendQuery,
    );
  }

  @Get('get-list-relationships')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get list relationships`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Friend.LIST_RELATIONSHIPS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListRelationships(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getListRelationshipsQuery: GetListRelationshipsQuery,
  ) {
    return this.friendsService.getListRelationships(
      userRoleId,
      getListRelationshipsQuery,
    );
  }

  @Post('create-friends-to-mongo/:id')
  @UseGuards(SecureCodeApiGuard)
  async createFriendsToMongo(
    @Body() friendForMongoDto: FriendForMongoDto,
    @Param('id') friendId: string,
  ) {
    return this.friendsService.createFriendsToMongo(
      friendForMongoDto,
      friendId,
    );
  }

  @Patch('update-friends-to-mongo/:id')
  @UseGuards(SecureCodeApiGuard)
  async updateFriendsToMongo(
    @Body() friendForMongoDto: FriendForMongoDto,
    @Param('id') friendId: string,
  ) {
    return this.friendsService.updateFriendsToMongo(
      friendForMongoDto,
      friendId,
    );
  }

  @Delete('delete-friends-to-mongo/:id')
  @UseGuards(SecureCodeApiGuard)
  async deleteFriendsToMongo(@Param('id') friendId: string) {
    return this.friendsService.deleteFriendsToMongo(friendId);
  }

  @Post('create-follows-to-mongo/:id')
  @UseGuards(SecureCodeApiGuard)
  async createFollowsToMongo(
    @Body() followForMongoDto: FollowForMongoDto,
    @Param('id') followId: string,
  ) {
    return this.friendsService.createFollowsToMongo(
      followForMongoDto,
      followId,
    );
  }

  @Patch('update-follows-to-mongo/:id')
  @UseGuards(SecureCodeApiGuard)
  async updateFollowsToMongo(
    @Body() followForMongoDto: FollowForMongoDto,
    @Param('id') followId: string,
  ) {
    return this.friendsService.updateFollowToMongo(followForMongoDto, followId);
  }

  @Delete('delete-follows-to-mongo/:id')
  @UseGuards(SecureCodeApiGuard)
  async deleteFollowsToMongo(@Param('id') followId: string) {
    return this.friendsService.deleteFollowToMongo(followId);
  }

  @Post('add-multi-friends')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Add multi friends`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Friend.UNBLOCKED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async addMultiFriends(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() addMultiFriendDto: AddMultiFriendDto,
  ) {
    return this.friendsService.addMultiFriends(userRoleId, addMultiFriendDto);
  }

  @Post('top-number-friends')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `unblock friends`,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getTopNumberFriends() {
    return this.friendsService.getTopFriends();
  }

  @Post('unblock-friends')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `unblock friends`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Friend.UNBLOCKED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async unblockFriend(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() unblockFriendsDto: UnblockFriendsDto,
  ) {
    return this.friendsService.unblockFriend(userRoleId, unblockFriendsDto);
  }

  @Patch('response-relationship')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Response relationship`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      ResponseMessage.Friend.ACCEPTED || ResponseMessage.Friend.REJECTED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async responseRelationship(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() responseRelationshipDto: ResponseRelationshipDto,
  ) {
    return this.friendsService.responseRelationship(
      responseRelationshipDto,
      userRoleId,
    );
  }

  @Post(':userId/request-relationship')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `request relationship`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Friend.REQUESTED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async requestRelationship(
    @Param('userId') userId: string,
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() requestRelationshipDto: RequestRelationshipDto,
  ): Promise<string> {
    return this.friendsService.requestRelationship(
      userId,
      userRoleId,
      requestRelationshipDto,
    );
  }

  @Post(':userId/block-friend')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `request relationship`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Friend.REQUESTED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async blockFriend(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('userId') userId: string,
  ) {
    return this.friendsService.blockFriend(userRoleId, userId);
  }

  @Delete(':userId/remove-relationship')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Unfriend`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Friend.REMOVED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async removeRelationship(
    @Param('userId') userId: string,
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() requestRelationshipDto: RequestRelationshipDto,
  ): Promise<string> {
    return this.friendsService.removeRelationship(
      userId,
      userRoleId,
      requestRelationshipDto,
    );
  }

  @Delete(':userId/delete-blocked-request')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Delete blocked friend request`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Friend.REMOVED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deleteBlockedFriendRequest(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('userId') userId: string,
  ) {
    return this.friendsService.deleteBlockedFriendRequest(userRoleId, userId);
  }
}

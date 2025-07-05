import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeaders,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthorizationGuard } from '../../../auth/guards/admin-authorization.guard';
import { LocalAuthGuard } from '../../../auth/guards/local-auth.guard';
import { SecureCodeApiGuard } from '../../../auth/guards/secure-code-api.guard';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../../common/decorators/authorization.decorator';
import { AskForReviewsDto } from '../dto/ask-for-reviews.dto';
import { CreateCoachDto, UpdateCoachDto } from '../dto/coach.dto';
import {
  AdminCreatePlayerDto,
  CoachCreatePlayerDto,
  ConfirmDraftPlayerDto,
  CreatePlayerDto,
  UpdatePlayerDto,
} from '../dto/player.dto';
import { CoachUpdatePlayerSkillsDto } from '../dto/player/player-skills.dto';
import { UserPresenceQuery } from '../dto/presence-status';
import { QueryBuilder } from '../dto/query-builder';
import { SearchUserDto } from '../dto/search-user.dto';
import { CreateSupporterDto, UpdateSupporterDto } from '../dto/supporter.dto';
import { GeneralUserDto, UpdateAccountEmailDto } from '../dto/user.dto';
import { CheckRelationshipRequestDto } from '../dto/user/user-check-relationship.dto';
import { UserTypes } from '../enum/user-types.enum';
import { UsersService } from './users.service';

import {
  PaginationDto,
  SortBy,
} from '../../../common/pagination/pagination.dto';
import { EducationDto } from '../dto/education.dto';

@ApiTags('Users')
@Controller('users')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Patch()
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Change user presence status`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Service unavailable',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Common.GET_SUCCESS,
  })
  async changeUserPresenceStatus(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() userPresenceQuery: UserPresenceQuery,
  ) {
    return this.usersService.changeUserPresenceStatus(
      userRoleId,
      userPresenceQuery,
    );
  }

  @Get()
  @ApiOperation({
    summary: `Query users by full text search`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Service unavailable',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Common.GET_SUCCESS,
  })
  async findAll(@Query() searchUserDto: SearchUserDto) {
    return this.usersService.findAll(searchUserDto);
  }

  @Get('list-user-by-query')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get list user by query`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListUsersByQuery(
    @Query() queryBuilder: QueryBuilder,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<FirebaseFirestore.DocumentData> {
    return this.usersService.getListUsersByQuery(queryBuilder, userRoleId);
  }

  @Get('check-relationship')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Check if user is friendmate or teammate`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async checkRelationship(
    @Query() checkRelationshipRequestDto: CheckRelationshipRequestDto,
    @AuthorizationAndGetUserId() userRoleId: string,
  ) {
    const { userIdQuery } = checkRelationshipRequestDto;
    return this.usersService.checkRelationship(userRoleId, userIdQuery);
  }

  @Post('ask-for-reviews')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Ask for reviews`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async askForReviews(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Body() askForReviewsDto: AskForReviewsDto,
  ) {
    return this.usersService.askForReviews(userRoleId, askForReviewsDto);
  }

  @Get('user-roles')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get user roles from uid token`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getUserRoles(@Req() req): Promise<any> {
    return this.usersService.getUserRoles(req.user.userId);
  }

  @Get('player-profile')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get player profile by getting user id from token`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getPlayerProfile(
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<FirebaseFirestore.DocumentData> {
    return this.usersService.getPlayerProfile(userRoleId);
  }

  @Post('/sync-users-to-mongo')
  @UseGuards(SecureCodeApiGuard)
  async syncUsersToMongo(@Body() generalUserDto: GeneralUserDto) {
    return await this.usersService.synchronizeUsersToMongoose(generalUserDto);
  }

  @Get('/coach-profile')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get coach profile`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getCoachProfile(
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<FirebaseFirestore.DocumentData> {
    return this.usersService.getCoachProfile(userRoleId);
  }

  @Get('/supporter-profile')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get supporter profile`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getSupporterProfile(
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<FirebaseFirestore.DocumentData> {
    return this.usersService.getSupporterProfile(userRoleId);
  }

  @Put('player')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create a new Player with uid from token`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: ResponseMessage.User.CANNOT_UPDATE,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.UPDATED_PLAYER_DATA,
  })
  async playerSignUp(
    @Req() req,
    @Body()
    createPlayerDto: CreatePlayerDto,
  ) {
    return this.usersService.playerSignUp(
      req.user.userId,
      createPlayerDto,
      req.user.email,
      req.user.phone,
    );
  }

  @Get('admin/draft-player')
  @ApiBearerAuth()
  @UseGuards(AdminAuthorizationGuard)
  @ApiOperation({
    summary: `Admin Get list draft player`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  async getListPlayerForAdmin(@Query() queryBuilder: any) {
    return this.usersService.adminGetListDraft(queryBuilder);
  }

  @Get('admin/draft-player/:draftPlayerId')
  @ApiBearerAuth()
  @UseGuards(AdminAuthorizationGuard)
  @ApiOperation({
    summary: `Admin Get a draft player`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  async getDraftPlayerById(@Param('draftPlayerId') draftPlayerId: string) {
    return this.usersService.getDraftPlayerById(draftPlayerId);
  }

  @Put('admin/draft-player')
  @ApiBearerAuth()
  @UseGuards(AdminAuthorizationGuard)
  @ApiOperation({
    summary: `Admin Create a new draft player`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: ResponseMessage.User.CANNOT_UPDATE,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.UPDATED_PLAYER_DATA,
  })
  async adminDraftPlayerSignUp(
    @Body()
    createPlayerDto: AdminCreatePlayerDto,
  ) {
    return this.usersService.adminDraftPlayerSignUp(createPlayerDto);
  }

  @Delete('admin/draft-player/:draftPlayerId')
  @ApiBearerAuth()
  @UseGuards(AdminAuthorizationGuard)
  @ApiOperation({
    summary: `Admin Delete a draft player`,
  })
  async adminDeleteDraftPlayer(@Param('draftPlayerId') draftPlayerId: string) {
    return this.usersService.adminDeleteDraftPlayer(draftPlayerId);
  }

  @Put('coach/draft-player')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Coach Create a new draft player`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: ResponseMessage.User.CANNOT_UPDATE,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.UPDATED_PLAYER_DATA,
  })
  async coachDraftPlayerSignUp(
    @Req() req,
    @Body()
    createPlayerDto: CoachCreatePlayerDto,
  ) {
    return this.usersService.coachDraftPlayerSignUp(
      req.user.userId,
      createPlayerDto,
    );
  }

  @Get('draft-profile/:secret')
  @ApiOperation({
    summary: `Get draft player profile by secret`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Not found draft player',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get draft player profile successfully',
  })
  async getDraftPlayerProfile(@Param('secret') secret: string) {
    const draftPlayer = await this.usersService.getDraftPlayerBySecret(secret);

    if (!draftPlayer || draftPlayer.secret !== secret) {
      throw new HttpException('Not found draft player', HttpStatus.NOT_FOUND);
    }

    return draftPlayer;
  }

  @Put('draft-profile/:secret')
  @ApiOperation({
    summary: `Confirm draft player`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Not found draft player',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Confirm draft player successfully',
  })
  async confirmDraftPlayer(
    @Body() confirmDraftPlayerDto: ConfirmDraftPlayerDto,
    @Param('secret') secret: string,
  ) {
    const draftPlayer = await this.usersService.confirmDraftPlayer(
      secret,
      confirmDraftPlayerDto,
    );

    return draftPlayer;
  }

  @Put('supporter')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create a new Supporter with uid from token`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: ResponseMessage.User.CANNOT_UPDATE,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.UPDATED_PLAYER_DATA,
  })
  async supporterSignUp(
    @Req() req,
    @Body()
    createSupporterDto: CreateSupporterDto,
  ) {
    return this.usersService.supporterSignUp(
      req.user.userId,
      createSupporterDto,
      req.user.email,
      req.user.phone,
    );
  }

  @Put('coach')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create a new Coach with uid from token`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: ResponseMessage.User.CANNOT_UPDATE,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.UPDATED_COACH_DATA,
  })
  async coachSignUp(
    @Req() req,
    @Body()
    createCoachDto: CreateCoachDto,
  ) {
    return this.usersService.coachSignUp(
      req.user.userId,
      createCoachDto,
      req.user.email,
      req.user.phone,
    );
  }

  @Get('verify-email/:code')
  @ApiOperation({
    summary: `Verify email by code`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async verifyEmail(@Param('code') code: string, @Res() res): Promise<any> {
    const result = await this.usersService.verifyEmail(code);
    if (result.isVerified) {
      return res.redirect(
        `${process.env.WEB_BASE_URL}/confirmation/true?bio=${result.bioUrl}`,
      );
    }
    return res.redirect(`${process.env.WEB_BASE_URL}/confirmation/false`);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Patch(':playerId/coach-update-player-skills')
  @ApiOperation({
    summary: `Update player skills`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updatePlayerSkills(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('playerId') playerId: string,
    @Body() coachUpdatePlayerSkillsDto: CoachUpdatePlayerSkillsDto,
  ) {
    return this.usersService.updatePlayerSkills(
      userRoleId,
      playerId,
      coachUpdatePlayerSkillsDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Patch('player/settings/')
  @ApiOperation({
    summary: `Update player settings`,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.UPDATE_SETTINGS_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updatePlayerSettings(
    @Req() req,
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Body() updatePlayerSettingsDto: UpdatePlayerDto,
  ) {
    return this.usersService.updatePlayerSettings(
      req.user.userId,
      userRoleId,
      updatePlayerSettingsDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Patch('coach/settings/')
  @ApiOperation({
    summary: `Update coach settings`,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.UPDATE_SETTINGS_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updateCoachSettings(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Body() updateCoachSettingsDto: UpdateCoachDto,
  ) {
    return this.usersService.updateCoachSettings(
      userRoleId,
      updateCoachSettingsDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Patch('supporter/settings/')
  @ApiOperation({
    summary: `Update supporter settings`,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.UPDATE_SETTINGS_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updateSupporterSettings(
    @AuthorizationAndGetUserId([UserTypes.SUPPORTER]) userRoleId: string,
    @Body() updateSupporterSettingsDto: UpdateSupporterDto,
  ) {
    return this.usersService.updateSupporterSettings(
      userRoleId,
      updateSupporterSettingsDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Patch('player/settings-v2/')
  @ApiOperation({
    summary: `Update player settings`,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.UPDATE_SETTINGS_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updatePlayerSettingsV2(
    @Req() req,
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() updatePlayerSettingsDto: UpdatePlayerDto,
  ) {
    return this.usersService.updatePlayerSettingsV2(
      // req.user.userId,
      userRoleId,
      updatePlayerSettingsDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Patch('coach/settings-v2/')
  @ApiOperation({
    summary: `Update coach settings`,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.UPDATE_SETTINGS_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updateCoachSettingsV2(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() updateCoachSettingsDto: UpdateCoachDto,
  ) {
    return this.usersService.updateCoachSettingsV2(
      userRoleId,
      updateCoachSettingsDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Patch('supporter/settings-v2/')
  @ApiOperation({
    summary: `Update supporter settings`,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.UPDATE_SETTINGS_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updateSupporterSettingsV2(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() updateSupporterSettingsDto: UpdateSupporterDto,
  ) {
    return this.usersService.updateSupporterSettingsV2(
      userRoleId,
      updateSupporterSettingsDto,
    );
  }

  @Delete()
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Delete user profile`,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Common.DELETED,
  })
  async remove(@AuthorizationAndGetUserId() userRoleId: string, @Req() req) {
    return this.usersService.remove(userRoleId, req.user.userId);
  }

  @Patch(':email')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Update account email`,
  })
  async updateAccountEmail(
    @Req() req,
    @Param() updateAccountEmail: UpdateAccountEmailDto,
  ) {
    const { email } = updateAccountEmail;
    return this.usersService.updateAccountEmail(req.user.userId, email);
  }

  @Get('/players/:playerId')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get player skills by Id`,
  })
  async getPlayerSkillsById(@Param('playerId') playerId: string) {
    return this.usersService.getPlayerSkillsById(playerId);
  }

  @Get('/my-teams/:userId')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get user list team`,
  })
  async getMyTeams(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('userId') userIdQuery: string,
  ) {
    return this.usersService.getMyTeams(userRoleId, userIdQuery);
  }

  /**
   * This function just for admin
   * @param userId except this userId
   * @returns [] || listUserForAdmin[] = Array<{userId, userType, username} || throw Forbidden
   */
  @Get('get-array-user-for-admin')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard, AdminAuthorizationGuard)
  @ApiOperation({
    summary: `Admin get array id of users`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Get ids of all users.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getArrayUserForAdmin(@AuthorizationAndGetUserId() userId: string) {
    return await this.usersService.getListUsersForAdmin(userId);
  }

  @Post('/education')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: 'Post user education',
    description: 'Allows users to post their education details.',
  })
  @ApiBody({ type: EducationDto })
  async getEducation(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() educationData: EducationDto,
  ) {
    return this.usersService.addEducation(userRoleId, educationData);
  }
  @Get('/get-list-education-record')
  @ApiOperation({ summary: 'Get list of education records' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Max number of records to return',
  })
  @ApiQuery({
    name: 'startAfter',
    required: false,
    type: Number,
    description: 'Offset or starting point for pagination',
  })
  @ApiQuery({
    name: 'sorted',
    required: false,
    enum: SortBy,
    example: SortBy.ASC,
    description: 'Sorting order (asc or desc)',
  })
  @ApiQuery({
    name: 'userIdQuery',
    required: false,
    type: String,
    description: 'Filter by user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of education records returned successfully',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getEducationList(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.usersService.getListEducationRecord(userRoleId, paginationDto);
  }
  @Get('/get-single-education-record')
  @ApiOperation({
    summary: 'Get a single education record by index if shareable',
  })
  @ApiQuery({
    name: 'key',
    required: true,
    description: 'Unique key to find each record',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Education record retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid index or request parameters',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'This education record is not shareable',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async getOneEducationRecord(
    @AuthorizationAndGetUserId() userRoleId: string,
    //Here i have used any three random parameters i.e so that we can find the unique record
    @Query('key') id: string,
  ) {
    return this.usersService.getOneEducationRecord(userRoleId, id);
  }
  @Delete('/delete-education-record/:educationId')
  @ApiOperation({
    summary: 'Delete a single education record by its educationId',
  })
  @ApiParam({
    name: 'educationId',
    required: true,
    description: 'The unique ID of the education record to be deleted',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Education record deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or education record not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You are not authorized to delete this record',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to delete education record due to server error',
  })
  async deleteEducationRecord(
    @AuthorizationAndGetUserId() userId: string,
    @Param('educationId') educationId: string,
  ) {
    return this.usersService.deleteEducationRecord(userId, educationId);
  }
  @Put('/update-education-record/:educationId')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: 'Update a single education record by its educationId',
  })
  @ApiParam({
    name: 'educationId',
    required: true,
    description: 'The unique ID of the education record to be updated',
  })
  @ApiBody({
    description:
      "Partial education data to update(don't send partial data send full form as form ui you can't send half data full form data is sent)",
    type: EducationDto,
    required: true,
    isArray: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Education record updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or education record not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You are not authorized to update this record',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to update education record due to server error',
  })
  async updateEducationRecord(
    @AuthorizationAndGetUserId() userId: string,
    @Param('educationId') educationId: string,
    @Body() updatedData: Partial<EducationDto>,
  ) {
    return this.usersService.updateEducationRecord(
      userId,
      educationId,
      updatedData,
    );
  }

  @Get('/public/education')
  @ApiOperation({
    summary: 'Publicly get a specific education record using query parameters',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'The ID of the user',
  })
  @ApiQuery({
    name: 'educationId',
    required: true,
    description: 'The unique education record ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Education record retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or education record not found',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Server error while fetching education record',
  })
  async getPublicEducationRecordById(
    @Query('userId') userId: string,
    @Query('educationId') educationId: string,
  ) {
    return this.usersService.getEducationRecordForSharing(userId, educationId);
  }

  @Get('/:userId')
  @ApiOperation({
    summary: `Get user info by Id`,
  })
  async getUserInfoById(@Param('userId') userId: string) {
    return this.usersService.getUserInfoById(userId);
  }

  @Put('/:userId/sponsor-info')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Update user info by Id`,
  })
  async updateUserInfoById(
    @Param('userId') userId: string,
    @Body() payload: any,
  ) {
    return this.usersService.saveSponsorInfo(userId, payload);
  }

  @Get('/:userId/sponsor-info')
  @ApiOperation({
    summary: `Get user info by Id`,
  })
  async fetchUserInfoById(
    @Param('userId') userId: string,
  ) {
    return this.usersService.getSponsorInfo(userId);
  }
}

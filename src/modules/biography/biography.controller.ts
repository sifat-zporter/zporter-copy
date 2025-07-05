import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { GetCareersDto } from '../careers/dto/career.dto';
import { BiographyService } from './biography.service';
import { CoachBioStatsDto } from './dto/coach-bio-stats.dto';
import { Head2HeadDto } from './dto/head-2-head.dto';
import { PlayerBioStatsDto } from './dto/player-bio-stats.dto';
import { UserBioDto } from './dto/player-bio.dto';
import { QueryBioForFlippingDto } from './dto/query-bio-for-flipping.dto';
import { UserUrlSEOResquest } from './dto/seo/user-url-SEO.request';

@ApiTags('Biographies')
@Controller('biographies')
@Throttle(60, 60)
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class BiographyController {
  constructor(private readonly biographyService: BiographyService) {}

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('share-biography')
  @ApiOperation({
    summary: `Share biography`,
  })
  shareBio(@AuthorizationAndGetUserId() userRoleId: string) {
    return this.biographyService.shareBio(userRoleId);
  }

  @Get('player')
  @ApiOperation({
    summary: `Get player biography`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Biography.GET_PLAYER_BIO_SUCCESS,
  })
  getPlayerBio(
    @AuthorizationAndGetUserId([false]) userRoleId: string,
    @Query() userBioDto?: UserBioDto,
  ) {
    return this.biographyService.getPlayerBio(userRoleId, userBioDto);
  }

  @Get('user-url-for-SEO')
  @ApiOperation({
    summary: `Get user URL for SEO`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Biography.GET_USERS_URL,
  })
  getUserUrlForSEO(@Query() userSEORequest: UserUrlSEOResquest) {
    if (userSEORequest.limit && userSEORequest.limit < 1) {
      throw new BadRequestException('limit must be more than 0!');
    }
    if (userSEORequest.limit && userSEORequest.limit > 50) {
      throw new BadRequestException('limit must be less than 50!');
    }

    return this.biographyService.getUserUrlForSEO(userSEORequest);
  }
  @Get('player-v2')
  @ApiOperation({
    summary: `Get player biography v2`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Biography.GET_PLAYER_BIO_SUCCESS,
  })
  getPlayerBioV2(
    @AuthorizationAndGetUserId([false]) userRoleId?: string,
    @Query() userBioDto?: UserBioDto,
  ) {
    return this.biographyService.getPlayerBioV2(userRoleId, userBioDto);
  }
  @Get('player-for-seo/:username')
  @ApiOperation({
    summary: `Get player description for SEO text`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Biography.GET_PLAYER_SEO_TEXT_SUCCESS,
  })
  getPlayerBioForSEO(
    @AuthorizationAndGetUserId([false]) userRoleId: string,
    @Param('username') userName: string,
  ) {
    return this.biographyService.getPlayerBioForSEO(userRoleId, userName);
  }
  @Get('supporter-for-seo/:username')
  @ApiOperation({
    summary: `Get supporter description for SEO text`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Biography.GET_SUPPORTER_SEO_TEXT_SUCCESS,
  })
  getSupporterBioForSEO(
    @AuthorizationAndGetUserId([false]) userRoleId: string,
    @Param('username') userName: string,
  ) {
    return this.biographyService.getSupporterBioForSEO(userRoleId, userName);
  }
  @Get('coach-for-seo/:username')
  @ApiOperation({
    summary: `Get coach description for SEO text`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Biography.GET_COACH_SEO_TEXT_SUCCESS,
  })
  getCoachBioForSEO(
    @AuthorizationAndGetUserId([false]) userRoleId: string,
    @Param('username') userName: string,
  ) {
    return this.biographyService.getCoachBioForSEO(userRoleId, userName);
  }

  @Get('player/stats')
  @ApiOperation({
    summary: `Get player stats`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Biography.GET_PLAYER_BIO_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getPlayerStats(
    @AuthorizationAndGetUserId([false]) userRoleId: string,
    @Query() playerBioStatsDto: PlayerBioStatsDto,
  ) {
    return this.biographyService.getPlayerStats(userRoleId, playerBioStatsDto);
  }

  @Get('player/stats-v2')
  @ApiOperation({
    summary: `Get player stats v2`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Biography.GET_PLAYER_BIO_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getPlayerStatsV2(
    @AuthorizationAndGetUserId([false]) userRoleId: string,
    @Query() playerBioStatsDto: PlayerBioStatsDto,
  ) {
    return this.biographyService.getPlayerStatsV2(
      userRoleId,
      playerBioStatsDto,
    );
  }

  @Get('player/clubs')
  @ApiOperation({
    summary: `Get player club careers`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Biography.GET_PLAYER_BIO_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getPlayerClubCareers(
    @AuthorizationAndGetUserId([false]) userRoleId?: string,
    @Query() getCareersDto?: GetCareersDto,
  ) {
    return this.biographyService.getPlayerClubStats(userRoleId, getCareersDto);
  }

  @Get('players/avg-radar')
  @ApiOperation({
    summary: `Get players avg radar skill`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  getPlayersAvgRadarSkill() {
    return this.biographyService.getPlayersAvgRadarSkill();
  }

  @Get('list-player-for-flipping')
  @ApiOperation({
    summary: `Get list player for flipping`,
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
  async getListUsersForFlipping(
    @AuthorizationAndGetUserId([false]) userRoleId?: string,
    @Query() queryBioForFlippingDto?: QueryBioForFlippingDto,
  ): Promise<FirebaseFirestore.DocumentData> {
    return this.biographyService.getListPlayersForFlippingV3(
      userRoleId,
      queryBioForFlippingDto,
    );
  }

  @Get('coach')
  @ApiOperation({
    summary: `Get coach biography`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Biography.GET_COACH_BIO_SUCCESS,
  })
  getCoachBio(
    @AuthorizationAndGetUserId([false]) userRoleId: string,
    @Query() userBioDto?: UserBioDto,
  ) {
    return this.biographyService.getCoachBio(userRoleId, userBioDto);
  }

  @Get('coach/stats')
  @ApiOperation({
    summary: `Get coach stats`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Biography.GET_COACH_BIO_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getCoachStats(
    @AuthorizationAndGetUserId([false]) userRoleId: string,
    @Query() coachBioStatsDto: CoachBioStatsDto,
  ) {
    return this.biographyService.getCoachStats(userRoleId, coachBioStatsDto);
  }

  @Get('coaches/avg-radar')
  @ApiOperation({
    summary: `Get coaches avg radar skill`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  getCoachesAvgRadarSkills() {
    return this.biographyService.getCoachesAvgRadarSkill();
  }

  @Get('players/head-2-head')
  @ApiOperation({
    summary: `player-head-2-head`,
  })
  playerHead2Head(
    @AuthorizationAndGetUserId([false]) userRoleId: string,
    @Query() head2HeadDto: Head2HeadDto,
  ) {
    return this.biographyService.player2Head2Head(userRoleId, head2HeadDto);
  }

  @Get('supporter')
  @ApiOperation({
    summary: `Get supporter biography`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Biography.GET_COACH_BIO_SUCCESS,
  })
  getSupporterBio(
    @AuthorizationAndGetUserId([false]) userRoleId: string,
    @Query() userBioDto?: UserBioDto,
  ) {
    return this.biographyService.getSupporterBio(userRoleId, userBioDto);
  }
  @Get('education-summary')
  @ApiOperation({ summary: 'Get summary of education types for a user' })
  @ApiQuery({
    name: 'userIdQuery',
    required: true,
    type: String,
    description: 'Filter by user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Summary of education types returned successfully',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getEducationSummary(@AuthorizationAndGetUserId() userRoleId: string) {
    return this.biographyService.getEducationTypeSummary(userRoleId);
  }
}

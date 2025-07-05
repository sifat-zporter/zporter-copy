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
  ApiBody,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../common/constants/common.constant';
import { UserRoleId } from '../../common/decorators/role-id.decorator';
import { UserTypes } from '../users/enum/user-types.enum';
import { AchievementsService } from './achievements.service';
import {
  CoachCreateAwardDto,
  CreateTrophyDto,
  PlayerCreateAwardDto,
} from './dto/create-achievement.dto';
import { GetAchievementDto } from './dto/get-achievement.dto';
import { GetCapsDto } from './dto/get-caps.dto';
import { GetConnectedHistoricClubsDto } from './dto/get-connected-historic-clubs.dto';
import {
  CreatePlayerPersonalGoalDto,
  UpdatePlayerPersonalGoalDto,
} from './dto/player-personal-goal.dto';
import {
  CoachUpdateAwardDto,
  PlayerUpdateAwardDto,
  UpdateTrophyDto,
} from './dto/update-achievement.dto';
import { LocalAchievementGuard } from '../../auth/guards/local-achivement.guard';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';

@ApiBearerAuth()
@UseGuards(LocalAuthGuard)
@ApiTags('Achievements')
@Controller('achievements')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get('player/diary-caps')
  @ApiOperation({
    summary: `Get player's diary caps`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.GET_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getPlayerDiaryCaps(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Query() getCapsDto: GetCapsDto,
  ) {
    return this.achievementsService.getPlayerDiaryCaps(userRoleId, getCapsDto);
  }

  @Get('coach/diary-caps')
  @ApiOperation({
    summary: `Get coach's diary caps`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.GET_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getCoachDiaryCaps(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Query() getCapsDto: GetCapsDto,
  ) {
    return this.achievementsService.getCoachDiaryCaps(userRoleId, getCapsDto);
  }

  @Get()
  @ApiOperation({
    summary: `Get all achievements`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Achievement.GET_ACHIEVEMENT_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  findAll(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getAchievementDto: GetAchievementDto,
  ) {
    return this.achievementsService.findAll(userRoleId, getAchievementDto);
  }

  @Get('connected-club-list')
  @ApiOperation({
    summary: `Get connected club list for achievement`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Club.GET_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  clubListForAchievement(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getConnectedHistoricClubsDto: GetConnectedHistoricClubsDto,
  ) {
    return this.achievementsService.connectedClubListForAchievement(
      userRoleId,
      getConnectedHistoricClubsDto,
    );
  }

  @Get(':achievementId')
  @ApiOperation({
    summary: `Get achievement by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Achievement.GET_ACHIEVEMENT_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  findOne(@Param('achievementId') achievementId: string) {
    return this.achievementsService.findOne(achievementId);
  }

  @Post('trophy')
  @ApiOperation({
    summary: `Create trophy`,
  })
  @ApiBody({ type: CreateTrophyDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Achievement.CREATED_ACHIEVEMENT,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  createTrophy(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() createTrophyDto: CreateTrophyDto,
  ) {
    return this.achievementsService.createTrophy(userRoleId, createTrophyDto);
  }

  @Patch('trophy/:achievementId')
  @ApiOperation({
    summary: `Update trophy`,
  })
  @ApiBody({ type: UpdateTrophyDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Achievement.UPDATED_ACHIEVEMENT,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  updateTrophy(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('achievementId') achievementId: string,
    @Body() updateTrophyDto: UpdateTrophyDto,
  ) {
    return this.achievementsService.updateTrophy(
      userRoleId,
      achievementId,
      updateTrophyDto,
    );
  }

  @Post('player/create-award')
  @ApiOperation({
    summary: `Player create award`,
  })
  @ApiBody({ type: PlayerCreateAwardDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Achievement.CREATED_ACHIEVEMENT,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  createAward(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() playerCreateAwardDto: PlayerCreateAwardDto,
  ) {
    return this.achievementsService.playerCreateAward(
      userRoleId,
      playerCreateAwardDto,
    );
  }

  @Post('coach/create-award')
  @ApiOperation({
    summary: `Coach create award`,
  })
  @ApiBody({ type: CoachCreateAwardDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Achievement.CREATED_ACHIEVEMENT,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  coachCreateAward(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() coachCreateAwardDto: CoachCreateAwardDto,
  ) {
    return this.achievementsService.coachCreateAward(
      userRoleId,
      coachCreateAwardDto,
    );
  }

  @UseGuards(LocalAchievementGuard)
  @Patch('player/update-award/:achievementId')
  @ApiOperation({
    summary: `Player update award`,
  })
  @ApiBody({ type: PlayerUpdateAwardDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Achievement.UPDATED_ACHIEVEMENT,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  playerUpdateAward(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('achievementId') achievementId: string,
    @Body() playerUpdateAwardDto: PlayerUpdateAwardDto,
  ) {
    return this.achievementsService.playerUpdateAward(
      userRoleId,
      achievementId,
      playerUpdateAwardDto,
    );
  }

  @UseGuards(LocalAchievementGuard)
  @Patch('coach/update-award/:achievementId')
  @ApiOperation({
    summary: `Coach update award`,
  })
  @ApiBody({ type: CoachUpdateAwardDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Achievement.UPDATED_ACHIEVEMENT,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  coachUpdateAward(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('achievementId') achievementId: string,
    @Body() coachUpdateAwardDto: CoachUpdateAwardDto,
  ) {
    return this.achievementsService.coachUpdateAward(
      userRoleId,
      achievementId,
      coachUpdateAwardDto,
    );
  }

  @UseGuards(LocalAchievementGuard)
  @Delete('delete-achievement/:achievementId/')
  @ApiOperation({
    summary: `Delete achievement`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Achievement.DELETED_ACHIEVEMENT_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  remove(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('achievementId') achievementId: string,
  ) {
    return this.achievementsService.removeAchievement(
      userRoleId,
      achievementId,
    );
  }

  @Post('player/create-personal-goal')
  @ApiOperation({
    summary: `player create personal goal`,
  })
  @ApiBody({ type: CreatePlayerPersonalGoalDto })
  createPersonalGoalForPlayer(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Body() createPlayerPersonalGoalDto: CreatePlayerPersonalGoalDto,
  ) {
    return this.achievementsService.createPersonalGoalForPlayer(
      userRoleId,
      createPlayerPersonalGoalDto,
    );
  }

  @Patch('player/update-personal-goal')
  @ApiOperation({
    summary: `player update personal goal`,
  })
  @ApiBody({ type: UpdatePlayerPersonalGoalDto })
  updatePersonalGoalForPlayer(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Body() updatePlayerPersonalGoalDto: UpdatePlayerPersonalGoalDto,
  ) {
    return this.achievementsService.updatePersonalGoalForPlayer(
      userRoleId,
      updatePlayerPersonalGoalDto,
    );
  }

  @Delete('player/delete-personal-goal/:docId')
  @ApiOperation({
    summary: `player delete personal goal`,
  })
  deletePersonalGoalForPlayer(
    @AuthorizationAndGetUserId([UserTypes.PLAYER, UserTypes.COACH])
    userRoleId: string,
    @Param('docId') docId: string,
  ) {
    return this.achievementsService.deletePersonalGoalForPlayer(
      userRoleId,
      docId,
    );
  }
}

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
  Headers,
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
import { UserTypes } from '../users/enum/user-types.enum';
import { DiaryService } from './diaries.service';
import {
  CoachCreateDiaryMatchDto,
  CoachCreateDiaryTrainingDto,
  CoachReviewDiaryDto,
  CoachUpdateDiaryMatchDto,
  CoachUpdateDiaryTrainingDto,
  CreateCoachDiaryCapDto,
  CreateHistoricTrainingDto,
  CreatePlayerDiaryCapDto,
  DeleteDiaryQueryDto,
  DiaryQueryBuilder,
  GetOriginalDiaryCalendarStatusDto,
  GetOriginalDiaryDto,
  PlayerCreateDiaryMatchDto,
  PlayerCreateDiaryTrainingDto,
  PlayerUpdateDiaryMatchDto,
  PlayerUpdateDiaryTrainingDto,
  UpdateCoachDiaryCapDto,
  UpdateCoachDiaryQueryDto,
  UpdateDiaryQueryDto,
  UpdateHistoricTrainingDto,
  UpdatePlayerDiaryCapDto,
} from './dto/diaries.req.dto';
import {
  OutputCreateCoachDiaryCap,
  OutputCreateDiary,
} from './dto/diaries.res.dto';
import { CreateInjuryDto, InjuryDto, UpdateInjuryDto } from './dto/injury.dto';

@ApiTags('Diaries')
@Controller('diaries')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @Get('get-original-diaries')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get original diaries`,
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
  async getOriginalDiaries(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getOriginalDiaryDto: GetOriginalDiaryDto,
  ) {
    return this.diaryService.getOriginalDiaries(
      userRoleId,
      getOriginalDiaryDto,
    );
  }

  @Get('get-original-diaries-calendar-status')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get original diaries as calendar status`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.GET_DIARY_CALENDAR_STATUS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getOriginalDiariesCalendarStatus(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getOriginalDiaryDto: GetOriginalDiaryCalendarStatusDto,
    @Headers('timezone') timezone: string,
  ) {
    return this.diaryService.getOriginalDiariesCalendarStatus(
      userRoleId,
      getOriginalDiaryDto,
      { timezone },
    );
  }

  @Get('player/get-diary-by-query')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Player: Get diary by query`,
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
  async playerGetDiaryByQueries(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Query() diaryQueryBuilder: DiaryQueryBuilder,
  ) {
    return this.diaryService.playerGetDiaryByQueries(
      diaryQueryBuilder,
      userRoleId,
    );
  }

  @Get('coach/get-diary-by-query')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Coach: Get diary by query`,
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
  async coachGetDiaryByQueries(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Query() diaryQueryBuilder: DiaryQueryBuilder,
  ) {
    return this.diaryService.coachGetDiaryByQueries(
      diaryQueryBuilder,
      userRoleId,
    );
  }

  @Post('player/create-diary-training')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Player: Create new diary training`,
  })
  @ApiBody({ type: PlayerCreateDiaryTrainingDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Diary.CREATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async playerCreateDiaryTraining(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Body() playerCreateDiaryTrainingDto: PlayerCreateDiaryTrainingDto,
  ): Promise<OutputCreateDiary> {
    return this.diaryService.playerCreateDiaryTraining(
      playerCreateDiaryTrainingDto,
      userRoleId,
    );
  }

  @Post('coach/create-diary-training')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Coach: Create new diary training`,
  })
  @ApiBody({ type: CoachCreateDiaryTrainingDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Diary.CREATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async coachCreateDiaryTraining(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Body() coachCreateDiaryTrainingDto: CoachCreateDiaryTrainingDto,
  ) {
    return this.diaryService.coachCreateDiaryTraining(
      coachCreateDiaryTrainingDto,
      userRoleId,
    );
  }

  @Post('player/create-diary-match')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Player: Create new diary match`,
  })
  @ApiBody({ type: PlayerCreateDiaryMatchDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Diary.CREATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async createDiaryMatch(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Body() playerCreateDiaryMatchDto: PlayerCreateDiaryMatchDto,
  ): Promise<OutputCreateDiary> {
    playerCreateDiaryMatchDto.match.validate();
    return this.diaryService.playerCreateDiaryMatch(
      playerCreateDiaryMatchDto,
      userRoleId,
    );
  }

  @Post('coach/create-diary-match')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Coach: Create new diary match`,
  })
  @ApiBody({ type: CoachCreateDiaryMatchDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Diary.CREATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async coachCreateDiaryMatch(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Body() coachCreateDiaryMatchDto: CoachCreateDiaryMatchDto,
  ) {
    return this.diaryService.coachCreateDiaryMatch(
      coachCreateDiaryMatchDto,
      userRoleId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('create-historic-training')
  @ApiOperation({
    summary: ` Create new historic training`,
  })
  @ApiBody({ type: CreateHistoricTrainingDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Diary.CREATE_HISTORIC,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  createHistoricTraining(
    @AuthorizationAndGetUserId() currentUserId: string,
    @Body() createHistoricTrainingDto: CreateHistoricTrainingDto,
  ) {
    return this.diaryService.createHistoricTraining(
      currentUserId,
      createHistoricTrainingDto,
    );
  }

  @Patch('player/update-diary-training')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Player: Update diary training`,
  })
  @ApiBody({ type: PlayerUpdateDiaryTrainingDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.UPDATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async playerUpdateDiaryTraining(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Query() updateDiaryQueryDto: UpdateDiaryQueryDto,
    @Body() playerUpdateDiaryTrainingDto: PlayerUpdateDiaryTrainingDto,
    @Headers('timezone') timezone: string,
  ): Promise<InjuryDto[]> {
    return this.diaryService.playerUpdateDiaryTraining(
      updateDiaryQueryDto,
      playerUpdateDiaryTrainingDto,
      userRoleId,
      timezone,
    );
  }

  @Patch('coach/update-diary-training')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Coach: Update diary training`,
  })
  @ApiBody({ type: CoachUpdateDiaryTrainingDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.UPDATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async coachUpdateDiaryTraining(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Query() updateDiaryQueryDto: UpdateDiaryQueryDto,
    @Body() coachUpdateDiaryTrainingDto: CoachUpdateDiaryTrainingDto,
    @Headers('timezone') timezone: string,
  ) {
    return this.diaryService.coachUpdateDiaryTraining(
      updateDiaryQueryDto,
      coachUpdateDiaryTrainingDto,
      userRoleId,
      timezone,
    );
  }

  @Patch('player/update-diary-match')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Player: Update diary match`,
  })
  @ApiBody({ type: PlayerUpdateDiaryMatchDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.UPDATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async playerUpdateDiaryMatch(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Query() updateDiaryQueryDto: UpdateDiaryQueryDto,
    @Body() playerUpdateDiaryMatchDto: PlayerUpdateDiaryMatchDto,
    @Headers('timezone') timezone: string,
  ): Promise<InjuryDto[]> {
    return this.diaryService.playerUpdateDiaryMatch(
      updateDiaryQueryDto,
      playerUpdateDiaryMatchDto,
      userRoleId,
      timezone,
    );
  }

  @Patch('coach/update-diary-match')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Coach: Update diary match`,
  })
  @ApiBody({ type: CoachUpdateDiaryMatchDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.UPDATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async coachUpdateDiaryMatch(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Query() updateDiaryQueryDto: UpdateDiaryQueryDto,
    @Body() coachUpdateDiaryMatchDto: CoachUpdateDiaryMatchDto,
    @Headers('timezone') timezone: string,
  ) {
    return this.diaryService.coachUpdateDiaryMatch(
      updateDiaryQueryDto,
      coachUpdateDiaryMatchDto,
      userRoleId,
      timezone,
    );
  }

  @Post('player/create-diary-cap')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Player: Create new diary cap`,
  })
  @ApiBody({ type: CreatePlayerDiaryCapDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Diary.CREATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async createPlayerDiaryCap(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Body() createPlayerDiaryCapDto: CreatePlayerDiaryCapDto,
  ): Promise<OutputCreateDiary> {
    return this.diaryService.createPlayerDiaryCap(
      userRoleId,
      createPlayerDiaryCapDto,
    );
  }

  @Post('coach/create-diary-cap')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Coach: Create new diary cap`,
  })
  @ApiBody({ type: CreateCoachDiaryCapDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Diary.CREATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async createCoachDiaryCap(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Body() createCoachDiaryCapDto: CreateCoachDiaryCapDto,
  ): Promise<OutputCreateCoachDiaryCap> {
    return this.diaryService.createCoachDiaryCap(
      userRoleId,
      createCoachDiaryCapDto,
    );
  }

  @Patch('player/update-diary-cap')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Player: Update diary cap`,
  })
  @ApiBody({ type: UpdatePlayerDiaryCapDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.UPDATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updatePlayerDiaryCap(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Query() updateDiaryQueryDto: UpdateDiaryQueryDto,
    @Body() updatePlayerDiaryCapDto: UpdatePlayerDiaryCapDto,
    @Headers('timezone') timezone: string,
  ): Promise<InjuryDto[]> {
    return this.diaryService.updatePlayerDiaryCap(
      updateDiaryQueryDto,
      updatePlayerDiaryCapDto,
      userRoleId,
      timezone,
    );
  }

  @Patch('coach/update-diary-cap')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Coach: Update diary cap`,
  })
  @ApiBody({ type: UpdateCoachDiaryCapDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.UPDATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updateCoachDiaryCap(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Query() updateDiaryQueryDto: UpdateCoachDiaryQueryDto,
    @Body() updateCoachDiaryCapDto: UpdateCoachDiaryCapDto,
    @Headers('timezone') timezone: string,
  ): Promise<any> {
    return this.diaryService.updateCoachDiaryCap(
      updateDiaryQueryDto,
      updateCoachDiaryCapDto,
      userRoleId,
      timezone,
    );
  }

  @Post('player/:diaryId/create-injury')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Player: Create injury`,
  })
  @ApiBody({ type: CreateInjuryDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Diary.CREATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async createInjury(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('diaryId') diaryId: string,
    @Body() createInjuryDto: CreateInjuryDto,
  ): Promise<InjuryDto> {
    return this.diaryService.createInjury(diaryId, createInjuryDto, userRoleId);
  }

  @Patch('player/update-injury')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Player: Update injury`,
  })
  @ApiBody({ type: UpdateInjuryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.UPDATE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updateInjury(
    @Query() updateDiaryQueryDto: UpdateDiaryQueryDto,
    @Body() updateInjuryDto: UpdateInjuryDto,
    @Headers('timezone') timezone: string,
  ): Promise<string> {
    return this.diaryService.updateInjury(
      updateDiaryQueryDto,
      updateInjuryDto,
      timezone,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Patch('/update-historic-training/:id')
  @ApiOperation({
    summary: ` Update historic training`,
  })
  @ApiBody({ type: UpdateHistoricTrainingDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Diary.UPDATE_HISTORIC,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  updateHistoricTraining(
    @Param('id') diaryId: string,
    @Body() updateHistoricTrainingDto: UpdateHistoricTrainingDto,
    @Headers('timezone') timezone: string,
  ) {
    return this.diaryService.updateHistoricTraining(
      diaryId,
      updateHistoricTrainingDto,
      timezone,
    );
  }

  @Delete('player/delete-injury')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Player: Delete injury`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.DELETE_INJURY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deleteInjury(
    @Query() deleteDiaryQueryDto: DeleteDiaryQueryDto,
  ): Promise<string> {
    return this.diaryService.deleteInjury(deleteDiaryQueryDto);
  }

  @Get(':diaryId/get-diary-by-id')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get diary by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.DELETE_INJURY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getDiaryById(
    @AuthorizationAndGetUserId() currentUserId: string,
    @Param('diaryId') diaryId: string,
  ) {
    return this.diaryService.getDiaryById(currentUserId, diaryId);
  }

  @Delete('delete-diary/:diaryId')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Delete diary`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.DELETE_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deleteDiary(@Param('diaryId') diaryId: string): Promise<string> {
    return this.diaryService.deleteDiary(diaryId);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Delete('/delete-historic-training/:id')
  @ApiOperation({
    summary: ` Delete historic training`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Diary.DELETE_HISTORIC,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  deleteHistoricTraining(@Param('id') diaryId: string) {
    return this.diaryService.deleteHistoricTraining(diaryId);
  }

  @Post('coach/:diaryId/review-diary')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Coach: Review diary`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async coachReviewDiary(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Param('diaryId') diaryId: string,
    @Body() coachReviewDiaryDto: CoachReviewDiaryDto,
  ) {
    return this.diaryService.coachReviewDiary(
      userRoleId,
      diaryId,
      coachReviewDiaryDto,
    );
  }
}

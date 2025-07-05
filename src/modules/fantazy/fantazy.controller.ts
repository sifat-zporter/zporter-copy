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
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { UserRoleId } from '../../common/decorators/role-id.decorator';
import {
  CreateFantazyTeam,
  DeletePlayerFantazy,
  GetListFantazyTeamQuery,
  GetListLeaderBoardsOfFantazyTeams,
  GetListPlayerQuery,
  OutputFantazyTeam,
  UpdateFantazyTeam,
  UserDetailDto,
} from './dto/fantazy.dto';
import { FantazyService } from './fantazy.service';
@ApiTags('Fantazy')
@Controller('fantazy')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class FantazyController {
  constructor(private readonly fantazyService: FantazyService) {}
  @Post('create-fantazy-team')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create new fantazy team`,
  })
  @ApiBody({ type: CreateFantazyTeam })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Fantazy.CREATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async createFantazyTeam(
    @Body() createFantazyTeam: CreateFantazyTeam,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<OutputFantazyTeam> {
    return this.fantazyService.createFantazyTeam(createFantazyTeam, userRoleId);
  }

  @Patch('update-fantazy-team/:fantazyId')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Update fantazy team`,
  })
  @ApiBody({ type: UpdateFantazyTeam })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Fantazy.UPDATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updateFantazyTeam(
    @Param('fantazyId') fantazyId: string,
    @Body() updateFantazyTeam: UpdateFantazyTeam,
    @AuthorizationAndGetUserId() userRoleId: string,
  ) {
    return this.fantazyService.updateFantazyTeam(
      updateFantazyTeam,
      userRoleId,
      fantazyId,
    );
  }

  @Patch('delete-players-fantazy-team/:fantazyId')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Delete fantazy team`,
  })
  @ApiBody({ type: DeletePlayerFantazy })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Fantazy.DELETED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deletePlayersFantazyTeam(
    @Param('fantazyId') fantazyId: string,
    @Body() deletePlayerFantazy: DeletePlayerFantazy,
    @AuthorizationAndGetUserId() userRoleId: string,
  ) {
    return this.fantazyService.deletePlayersFantazyTeam(
      deletePlayerFantazy,
      userRoleId,
      fantazyId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-list-fantazy-teams')
  @ApiOperation({
    summary: `Get list fantazy teams`,
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
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getListFantazyTeamQuery: GetListFantazyTeamQuery,
  ) {
    return this.fantazyService.getListFantazyTeams(
      userRoleId,
      getListFantazyTeamQuery,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-list-suggestion-players')
  @ApiOperation({
    summary: `Get list suggestion players`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListPlayer(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getListPlayerQuery: GetListPlayerQuery,
  ) {
    return this.fantazyService.getListPlayer(userRoleId, getListPlayerQuery);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-list-leader-boards-of-fantazy-teams')
  @ApiOperation({
    summary: `Get list leader boards pf the fantazy teams`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListLeaderBoardsOfFantazyTeams(
    @Query()
    getListLeaderBoardsOfFantazyTeamsQuery: GetListLeaderBoardsOfFantazyTeams,
  ) {
    return this.fantazyService.getListLeaderBoardsOfFantazyTeams(
      getListLeaderBoardsOfFantazyTeamsQuery,
    );
  }
}

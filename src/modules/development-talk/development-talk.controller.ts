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
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { UserRoleId } from '../../common/decorators/role-id.decorator';
import { UserTypes } from '../users/enum/user-types.enum';
import { DevelopmentTalkService } from './development-talk.service';
import {
  CoachCommentDevelopmentNoteDto,
  GetDevelopmentNoteQuery,
  PlayerCreateDevelopmentNoteDto,
  PlayerUpdateDevelopmentNoteDto,
} from './dto/development-talk.req.dto';

@ApiBearerAuth()
@UseGuards(LocalAuthGuard)
@ApiTags('Development talk')
@Controller('development-talk')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class DevelopmentTalkController {
  constructor(
    private readonly developmentTalkService: DevelopmentTalkService,
  ) {}

  @Get('coach/filter-development-notes')
  @ApiOperation({
    summary: `Coach: Filter development note`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async filterDevelopmentNotes(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Query() getDevelopmentNoteQuery: GetDevelopmentNoteQuery,
  ) {
    return this.developmentTalkService.findOneByQuery(
      userRoleId,
      getDevelopmentNoteQuery,
    );
  }

  @Post('player/create-development-note')
  @ApiOperation({
    summary: `Player: Create development note`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async playerCreateDevelopmentNote(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Body() playerCreateDevelopmentTalkDto: PlayerCreateDevelopmentNoteDto,
  ) {
    return this.developmentTalkService.playerCreateDevelopmentNote(
      userRoleId,
      playerCreateDevelopmentTalkDto,
    );
  }

  @Post('coach/comment-development-note/:devTalkId')
  @ApiOperation({
    summary: `Coach: Comment development note`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async coachCommentDevelopmentNote(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Param('devTalkId') devTalkId: string,
    @Body() coachCommentDevelopmentNoteDto: CoachCommentDevelopmentNoteDto,
  ) {
    return this.developmentTalkService.coachCommentDevelopmentNote(
      userRoleId,
      devTalkId,
      coachCommentDevelopmentNoteDto,
    );
  }

  @Patch('player/update-development-note/:devTalkId')
  @ApiOperation({
    summary: `Player: Update development note`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async playerUpdateDevelopmentNote(
    @Param('devTalkId') devTalkId: string,
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Body() playerUpdateDevelopmentNoteDto: PlayerUpdateDevelopmentNoteDto,
  ) {
    return this.developmentTalkService.playerUpdateDevelopmentNote(
      devTalkId,
      userRoleId,
      playerUpdateDevelopmentNoteDto,
    );
  }

  @Delete('delete-development-note/:devTalkId')
  @ApiOperation({
    summary: `Delete development note`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deleteDevelopmentNote(
    @AuthorizationAndGetUserId([UserTypes.PLAYER]) userRoleId: string,
    @Param('devTalkId') devTalkId: string,
  ) {
    return this.developmentTalkService.deleteDevelopmentNote(
      userRoleId,
      devTalkId,
    );
  }
}

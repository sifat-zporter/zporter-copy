import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import {
  CreateCommentDto,
  DeleteCommentPayload,
  GetCommentDto,
  GetCommentResult,
  ResponseDelete,
} from './dto/comments.dto';
import { ApiBearerAuth, ApiHeaders, ApiTags } from '@nestjs/swagger';
import { IdPipe } from './comment.validator';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { UserTypes } from '../users/enum/user-types.enum';
import { RoleUser } from '../../common/decorators/user-role.decorator';
import { CommentEntity } from './ comments.entity';
import { ResponseMessage } from '../../common/constants/common.constant';

@ApiTags('user-comments')
@Controller('user-comments')
export class CommentsController {
  constructor(private readonly commentService: CommentsService) {}

  @ApiBearerAuth()
  @ApiHeaders([
    {
      name: 'roleId',
    },
  ])
  @Get(':typeId')
  @UseGuards(LocalAuthGuard)
  getCommentsByType(
    @RoleUser([UserTypes.COACH, UserTypes.PLAYER])
    userRoleId: string,
    @Param('typeId', IdPipe)
    typeId: string,
    @Query() query: GetCommentDto,
  ): Promise<GetCommentResult> {
    const { limit, page } = query;
    const pageSize = +limit || 10;
    const pageNumber = +page || 1;
    return this.commentService.getComentByTypeId(
      {
        page: pageNumber,
        limit: pageSize,
      },
      typeId,
    );
  }

  @ApiBearerAuth()
  @ApiHeaders([
    {
      name: 'roleId',
    },
  ])
  @UseGuards(LocalAuthGuard)
  @Post()
  createComment(
    @RoleUser([UserTypes.COACH, UserTypes.PLAYER])
    userRoleId: string,
    @Body() payload: CreateCommentDto,
  ): Promise<CommentEntity> {
    const { userId } = payload;
    if (userId !== userRoleId)
      throw new BadRequestException(ResponseMessage.Common.BAD_REQUEST);
    return this.commentService.createComment(payload);
  }

  @ApiBearerAuth()
  @ApiHeaders([
    {
      name: 'roleId',
    },
  ])
  @UseGuards(LocalAuthGuard)
  @Delete()
  async deleteComment(
    @RoleUser([UserTypes.COACH, UserTypes.PLAYER])
    userRoleId: string,
    @Body() payload: DeleteCommentPayload,
  ): Promise<ResponseDelete> {
    const { userId } = payload;
    if (userId !== userRoleId)
      throw new BadRequestException(ResponseMessage.Common.BAD_REQUEST);
    await this.commentService.deleteComment(payload);
    return {
      status: ResponseMessage.Common.SUCCESS,
    };
  }
}
